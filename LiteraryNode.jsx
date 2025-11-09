/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import { Billboard, Text, Sphere, Image, Plane, Circle, Octahedron } from "@react-three/drei";
import { RigidBody, BallCollider } from "@react-three/rapier";
import { setSelectedNode, setActivePanel, focusNode } from "./actions";
import React, { useMemo, useRef, useState, forwardRef, useImperativeHandle, useEffect, memo, Suspense, useLayoutEffect } from "react";
import * as THREE from 'three';
import { Color } from "three";
import { useFrame, useLoader } from "@react-three/fiber";
import useStore from "./store";
import { animate } from "motion";


// Error boundary to catch image loading failures from useLoader
class ImageErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.warn(`Image load error for ${this.props.url}:`, error, errorInfo);
  }
  
  // Reset state if the URL changes so we can retry loading a new image
  componentDidUpdate(prevProps) {
    if (this.props.url !== prevProps.url) {
      this.setState({ hasError: false });
    }
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback;
    }
    return this.props.children;
  }
}


// Shader for creating circular, grayscalable images for author nodes
const vertexShader = `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const fragmentShader = `
  uniform sampler2D tex;
  uniform float isGrayscale;
  uniform float opacity;
  varying vec2 vUv;

  void main() {
    vec4 color = texture2D(tex, vUv);

    // Circle mask with smoothstep for anti-aliasing
    float dist = distance(vUv, vec2(0.5));
    float mask = 1.0 - smoothstep(0.49, 0.5, dist);

    // Grayscale effect
    if (isGrayscale > 0.5) {
        float gray = dot(color.rgb, vec3(0.299, 0.587, 0.114));
        color.rgb = vec3(gray);
    }
    
    gl_FragColor = vec4(color.rgb, color.a * opacity * mask);
  }
`;

// A component to load the texture and create the shader material with a fade-in effect.
const FadingImagePlane = ({ imageUrl, size, isGrayscale, opacity, isBook = false }) => {
    const texture = useLoader(THREE.TextureLoader, imageUrl);
    const materialRef = useRef();

    // Animate opacity on load
    useLayoutEffect(() => {
        if (materialRef.current) {
            materialRef.current.uniforms.opacity.value = 0;
            animate(
                (v) => { if (materialRef.current) materialRef.current.uniforms.opacity.value = v },
                { from: 0, to: opacity, duration: 0.8, ease: 'easeOut' }
            );
        }
    }, [texture, opacity]); // Rerun when texture or target opacity changes
    
    const shaderMaterial = useMemo(() => new THREE.ShaderMaterial({
        uniforms: {
            tex: { value: texture },
            isGrayscale: { value: isGrayscale ? 1.0 : 0.0 },
            opacity: { value: 0 }, // Start at 0
        },
        vertexShader,
        fragmentShader,
        transparent: true,
    }), [texture, isGrayscale]);

    const planeArgs = isBook ? [size[0], size[1]] : [size * 2, size * 2];

    return (
        <Plane args={planeArgs}>
            <primitive ref={materialRef} object={shaderMaterial} attach="material" />
        </Plane>
    );
};


const getInitials = (name) => {
    if (!name || typeof name !== 'string') return '?';
    const parts = name.trim().split(' ').filter(Boolean);
    if (parts.length > 1) {
        const first = parts[0][0];
        const last = parts[parts.length - 1][0];
        return (first + last).toUpperCase();
    }
    if (parts.length === 1 && parts[0].length > 1) {
        return parts[0].substring(0, 2).toUpperCase();
    }
    return (parts[0]?.[0] || '?').toUpperCase();
};


const LiteraryNode = forwardRef(({
  id,
  label,
  position,
  initialPosition,
  color,
  highlight,
  isExpanding,
  dim,
  selectionActive,
  isInPath,
  imageUrl,
  type,
  authorWithImage,
  size = 0.7,
  selectedNodePosition,
  livePositionsRef
}, ref) => {
  const rigidBodyRef = useRef();
  const groupRef = useRef();

  useImperativeHandle(ref, () => rigidBodyRef.current);
  
  const isNewNode = !!initialPosition;
  const [isAnimatingIn, setIsAnimatingIn] = useState(isNewNode);

  const finalPos = useMemo(() => new THREE.Vector3(...position), [position]);
  const isNeighbor = selectionActive && !highlight && !dim;

  // New useEffect to manage body type imperatively, preventing component remounts.
  useEffect(() => {
    if (!rigidBodyRef.current) return;
    
    const isKinematic = highlight || isAnimatingIn || isNeighbor;
    
    rigidBodyRef.current.setBodyType(
      isKinematic ? 'kinematicPosition' : 'dynamic',
      true // Wake the body up after changing its type
    );
  }, [highlight, isAnimatingIn, isNeighbor]);
  
  // Create deterministic, unique orbital parameters for each node to de-synchronize their animations.
  const orbitParams = useMemo(() => {
      let hash = 0;
      for (let i = 0; i < id.length; i++) {
          hash = (hash << 5) - hash + id.charCodeAt(i);
          hash |= 0; // Convert to 32bit integer
      }

      // Use the hash to create a unique, tilted axis
      const axis = new THREE.Vector3(
          Math.sin(hash * 0.3) * 0.5,
          Math.cos(hash * 0.5) * 1.0, // Y is dominant for a generally upright orbit
          Math.sin(hash * 0.7) * 0.5,
      ).normalize();
      
      // Use another part of the hash for a phase offset, so they don't all start at the same point
      const phase = (hash & 0xff) / 0xff * Math.PI * 2;
      
      return { axis, phase };
  }, [id]);


  // Optimization: pre-allocate vectors for use in the animation loop to avoid GC overhead.
  const { currentVec, newPosVec, centerPosVec, initialRelativePosVec, rotatedPosVec } = useMemo(() => ({
    currentVec: new THREE.Vector3(),
    newPosVec: new THREE.Vector3(),
    centerPosVec: new THREE.Vector3(),
    initialRelativePosVec: new THREE.Vector3(),
    rotatedPosVec: new THREE.Vector3()
  }), []);


  useFrame((state, delta) => {
    if (!rigidBodyRef.current) return;
    const currentPos = rigidBodyRef.current.translation();
    
    // Update live position for edge rendering
    if (livePositionsRef && livePositionsRef.current) {
      if (!livePositionsRef.current[id]) {
        livePositionsRef.current[id] = new THREE.Vector3();
      }
      livePositionsRef.current[id].set(currentPos.x, currentPos.y, currentPos.z);
    }

    // Animate position for new nodes
    if (isAnimatingIn) {
      currentVec.set(currentPos.x, currentPos.y, currentPos.z);
      
      if (currentVec.distanceTo(finalPos) < 0.1) {
        rigidBodyRef.current.setTranslation(finalPos, true);
        setIsAnimatingIn(false);
      } else {
        const newPos = newPosVec.lerpVectors(currentVec, finalPos, delta * 5);
        rigidBodyRef.current.setTranslation(newPos, true);
      }
    }

    // Orbital animation for neighbors
    if (isNeighbor && selectedNodePosition) {
        centerPosVec.set(...selectedNodePosition);
        
        // The node's "at rest" position relative to the center. Using this stable vector prevents drift.
        initialRelativePosVec.copy(finalPos).sub(centerPosVec);

        const orbitSpeed = 0.3; // Radians per second
        
        // Calculate the total rotation based on elapsed time for a smooth, continuous animation
        const rotationAngle = state.clock.elapsedTime * orbitSpeed + orbitParams.phase;
        
        // Apply the unique, deterministic rotation
        rotatedPosVec.copy(initialRelativePosVec).applyAxisAngle(orbitParams.axis, rotationAngle);
        
        const newPos = newPosVec.copy(centerPosVec).add(rotatedPosVec);
        rigidBodyRef.current.setNextKinematicTranslation(newPos);
    }

    // Animate scale for node state changes
    if (groupRef.current) {
      let targetScale = isInPath ? 1.7 : highlight ? 1.5 : isNeighbor ? 1.1 : 1;
      
      if (isExpanding) {
        const pulseFrequency = 12; // Faster pulse for loading state
        const pulseAmplitude = 0.15;
        targetScale = 1.5 + Math.sin(state.clock.elapsedTime * pulseFrequency) * pulseAmplitude;
      } else if (highlight) {
        // Subtle pulsing animation for the highlighted node
        const pulseFrequency = 4;
        const pulseAmplitude = 0.05;
        targetScale += Math.sin(state.clock.elapsedTime * pulseFrequency) * pulseAmplitude;
      }
      
      groupRef.current.scale.lerp(new THREE.Vector3(targetScale, targetScale, targetScale), 0.1);
    }
  });

  let opacity = 0.8;
  if (highlight || isInPath) opacity = 1;
  else if (isNeighbor) opacity = 0.9;
  else if (dim) opacity = 0.4;

  let emissiveIntensity = 0.6;
  if (isInPath) emissiveIntensity = 1.8;
  else if (highlight) emissiveIntensity = 1.2;
  else if (isNeighbor) emissiveIntensity = 0.9;
  else if (dim) emissiveIntensity = 0.05;

  const displayColor = useMemo(() => {
    const c = new Color(color);
    if (dim) {
      const grayscale = c.r * 0.299 + c.g * 0.587 + c.b * 0.114;
      c.setRGB(grayscale, grayscale, grayscale);
    }
    return c;
  }, [color, dim]);

  const effectiveSize = size * (type === 'book' || type === 'author' ? 1.4 : 1);
  const labelOffset = -(effectiveSize + 0.3);

  const renderNodeShape = () => {
    const glowOpacity = dim ? 0.05 : (isInPath ? 0.4 : highlight ? 0.3 : isNeighbor ? 0.2 : 0.15);

    switch (type) {
      case 'book': {
        const bookAspectRatio = 2 / 3;
        const bookHeight = effectiveSize * 2;
        const bookWidth = bookHeight * bookAspectRatio;

        // Button dimensions for precise positioning
        const infoButtonWidth = 0.5;
        const infoButtonHeight = 0.3;
        const authorButtonWidth = 0.6;
        const authorButtonHeight = 0.3;
        const buttonPadding = 0.05;

        const bookPlaceholder = (
            <Plane args={[bookWidth, bookHeight]}>
                <meshStandardMaterial
                    color={displayColor}
                    emissive={displayColor}
                    emissiveIntensity={emissiveIntensity}
                    transparent
                    opacity={opacity}
                    roughness={0.4}
                    metalness={0.1}
                />
            </Plane>
        );

        return (
          <Billboard>
            {/* Glow effect for books */}
            <Plane args={[bookWidth * 1.1, bookHeight * 1.1]} position-z={-0.02}>
                <meshBasicMaterial
                    color={color}
                    transparent
                    blending={THREE.AdditiveBlending}
                    opacity={glowOpacity}
                />
            </Plane>
            {imageUrl ? (
              <ImageErrorBoundary fallback={bookPlaceholder} url={imageUrl}>
                <Suspense fallback={bookPlaceholder}>
                    <FadingImagePlane 
                        imageUrl={imageUrl} 
                        size={[bookWidth, bookHeight]} 
                        isGrayscale={dim} 
                        opacity={opacity} 
                        isBook={true}
                    />
                    {/* Info Button */}
                    <group
                      position={[
                        (bookWidth / 2) - (infoButtonWidth / 2) - buttonPadding,
                        (bookHeight / 2) - (infoButtonHeight / 2) - buttonPadding,
                        0.01
                      ]}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (useStore.getState().selectedNode !== id) {
                            focusNode(id);
                        }
                        setActivePanel('details');
                      }}
                      onPointerEnter={() => (document.body.style.cursor = 'pointer')}
                      onPointerLeave={() => (document.body.style.cursor = 'auto')}
                    >
                      <Plane args={[infoButtonWidth, infoButtonHeight]}><meshBasicMaterial color="#222" transparent opacity={0.7} /></Plane>
                      <Text
                        font="https://storage.googleapis.com/experiments-uploads/g2demos/photo-applet/google-sans.ttf"
                        fontSize={0.15} color="white" anchorX="center" anchorY="middle"
                        position-z={0.01} material-depthTest={false}
                      >Info</Text>
                    </group>
                    {/* Author Button */}
                    {authorWithImage && (
                      <group
                        position={[
                          (bookWidth / 2) - (authorButtonWidth / 2) - buttonPadding,
                          -(bookHeight / 2) + (authorButtonHeight / 2) + buttonPadding,
                          0.01
                        ]}
                        onClick={(e) => { e.stopPropagation(); setSelectedNode(authorWithImage.id); }}
                        onPointerEnter={() => (document.body.style.cursor = 'pointer')}
                        onPointerLeave={() => (document.body.style.cursor = 'auto')}
                      >
                        <Plane args={[authorButtonWidth, authorButtonHeight]}><meshBasicMaterial color="#222" transparent opacity={0.7} /></Plane>
                        <Text
                          font="https://storage.googleapis.com/experiments-uploads/g2demos/photo-applet/google-sans.ttf"
                          fontSize={0.15} color="white" anchorX="center" anchorY="middle"
                          position-z={0.01} material-depthTest={false}
                        >Author</Text>
                      </group>
                    )}
                </Suspense>
              </ImageErrorBoundary>
            ) : (
                bookPlaceholder
            )}
          </Billboard>
        );
      }
      case 'author': {
        const authorPlaceholder = (
            <>
                <Circle args={[effectiveSize, 64]}>
                  <meshStandardMaterial
                    color={displayColor}
                    emissive={displayColor}
                    emissiveIntensity={emissiveIntensity * 0.4}
                    transparent
                    opacity={opacity}
                    roughness={0.4}
                    metalness={0.1}
                  />
                </Circle>
                <Text
                    font="https://storage.googleapis.com/experiments-uploads/g2demos/photo-applet/google-sans.ttf"
                    fontSize={effectiveSize * 0.9}
                    color="white"
                    anchorX="center"
                    anchorY="middle"
                    position-z={0.01}
                    material-depthTest={false}
                >
                    {getInitials(label)}
                </Text>
            </>
        );

        return (
          <Billboard>
            {/* Glow effect for authors */}
            <Circle args={[effectiveSize * 1.1, 32]} position-z={-0.02}>
                <meshBasicMaterial
                    color={color}
                    transparent
                    blending={THREE.AdditiveBlending}
                    opacity={glowOpacity}
                />
            </Circle>
            {imageUrl ? (
              <ImageErrorBoundary fallback={authorPlaceholder} url={imageUrl}>
                <Suspense fallback={authorPlaceholder}>
                    <FadingImagePlane 
                        imageUrl={imageUrl} 
                        size={effectiveSize} 
                        isGrayscale={dim} 
                        opacity={opacity} 
                    />
                </Suspense>
              </ImageErrorBoundary>
            ) : (
              authorPlaceholder
            )}
          </Billboard>
        );
      }
      case 'theme': {
        return (
            <Octahedron args={[size]}>
                <meshStandardMaterial
                  color={displayColor}
                  emissive={displayColor}
                  emissiveIntensity={emissiveIntensity}
                  transparent
                  opacity={opacity * 0.9}
                  roughness={0.1}
                  metalness={0.2}
                />
            </Octahedron>
        );
      }
      default:
        // Fallback to sphere for any unspecified types
        return (
          <Sphere args={[size, 32, 32]} castShadow>
            <meshStandardMaterial
              color={displayColor}
              emissive={displayColor}
              emissiveIntensity={emissiveIntensity}
              transparent
              opacity={opacity}
              roughness={0.4}
              metalness={0.1}
            />
          </Sphere>
        );
    }
  };

  return (
    <RigidBody
      ref={rigidBodyRef}
      position={isNewNode ? initialPosition : position}
      linearDamping={4}
      angularDamping={1}
      colliders={false}
      onPointerEnter={() => (document.body.style.cursor = 'pointer')}
      onPointerLeave={() => (document.body.style.cursor = 'auto')}
      onClick={(e) => {
        e.stopPropagation();
        setSelectedNode(id);
      }}
    >
      <BallCollider args={[effectiveSize]} />
      <group ref={groupRef} scale={isNewNode ? 0.01 : 1}>
        {renderNodeShape()}

        {/* Label for all nodes */}
        <Billboard>
          <Text
            font="https://storage.googleapis.com/experiments-uploads/g2demos/photo-applet/google-sans.ttf"
            fontSize={0.3}
            color="white"
            anchorX="center"
            anchorY="top"
            position={[0, labelOffset, 0]}
            maxWidth={3}
            textAlign="center"
            fillOpacity={type === 'theme' ? 1.0 : (highlight || isInPath ? 1 : 0)}
            outlineColor="#111"
            outlineWidth={0.02}
          >
            {label}
          </Text>
        </Billboard>
      </group>
    </RigidBody>
  );
});

export default memo(LiteraryNode);