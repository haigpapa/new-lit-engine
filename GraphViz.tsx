/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import {Canvas, useFrame, useThree} from '@react-three/fiber'
import {TrackballControls, QuadraticBezierLine} from '@react-three/drei'
import {useRef, useEffect, useMemo, Suspense} from 'react'
import {animate} from 'motion'
import useStore from './store'
import LiteraryNode from './LiteraryNode'
import {setSelectedNode} from './actions'
import * as THREE from 'three'
import { Physics } from '@react-three/rapier'
import type { Node } from './types'

interface GraphEdgeProps {
  sourceId: string;
  targetId: string;
  livePositions: React.MutableRefObject<Record<string, THREE.Vector3>>;
  color: string;
  lineWidth: number;
  transparent: boolean;
  opacity: number;
}

const GraphEdge: React.FC<GraphEdgeProps> = ({ sourceId, targetId, livePositions, ...styleProps }) => {
    const lineRef = useRef<any>(null);
    const { camera } = useThree();
    const { nodes } = useStore.getState(); // non-reactive read
    const sourceNode = nodes[sourceId];
    const targetNode = nodes[targetId];

    const startVec = useMemo<THREE.Vector3>(() => new THREE.Vector3(), []);
    const endVec = useMemo<THREE.Vector3>(() => new THREE.Vector3(), []);
    const midVec = useMemo<THREE.Vector3>(() => new THREE.Vector3(), []);

    useFrame(() => {
        if (!lineRef.current || !sourceNode || !targetNode || !livePositions.current) return;

        const sourcePos = livePositions.current[sourceId];
        const targetPos = livePositions.current[targetId];

        if (!sourcePos || !targetPos) {
            if (lineRef.current.visible) lineRef.current.visible = false;
            return;
        };

        startVec.copy(sourcePos);
        endVec.copy(targetPos);

        const getNodeRadius = (node: Node | undefined): number => {
            if (!node) return 0.5;
            if (node.type === 'theme') return node.size || 0.7;
            const effectiveSize = (node.size || 0.7) * 1.4;
            if (node.type === 'author') return effectiveSize;
            if (node.type === 'book') {
                const bookAspectRatio = 2/3;
                const bookHeight = effectiveSize * 2;
                const bookWidth = bookHeight * bookAspectRatio;
                return Math.sqrt(Math.pow(bookWidth / 2, 2) + Math.pow(bookHeight / 2, 2)) * 0.8; // Use 80% of diagonal
            }
            return node.size || 0.7;
        };

        const sourceRadius = getNodeRadius(sourceNode);
        const targetRadius = getNodeRadius(targetNode);

        const direction = new THREE.Vector3().subVectors(endVec, startVec);
        const length = direction.length();
        const epsilon = 0.001;

        if (length < sourceRadius + targetRadius || length < epsilon) {
            if (lineRef.current.visible) lineRef.current.visible = false;
            return;
        }

        if (!lineRef.current.visible) lineRef.current.visible = true;

        direction.normalize();

        const modifiedStart = startVec.clone().add(direction.clone().multiplyScalar(sourceRadius));
        const modifiedEnd = endVec.clone().sub(direction.clone().multiplyScalar(targetRadius));

        midVec.lerpVectors(modifiedStart, modifiedEnd, 0.5);
        const perpendicular = new THREE.Vector3().crossVectors(direction, camera.position).normalize();

        const arcAmount = length * 0.15;
        midVec.add(perpendicular.multiplyScalar(arcAmount));

        lineRef.current.setPoints(modifiedStart, modifiedEnd, midVec);
    });

    return <QuadraticBezierLine ref={lineRef} start={[0,0,0]} end={[1,1,1]} {...styleProps} />;
};


function SceneContent() {
  const nodes = useStore(s => s.nodes);
  const edges = useStore(s => s.edges);
  const selectedNode = useStore(s => s.selectedNode);
  const expandingNodeId = useStore(s => s.expandingNodeId);
  const resetCam = useStore(s => s.resetCam);
  const nodeFilters = useStore(s => s.nodeFilters);
  const connectionPath = useStore(s => s.connectionPath);
  const isTimelineActive = useStore(s => s.isTimelineActive);
  const timelineRange = useStore(s => s.timelineRange);

  const livePositionsRef = useRef<Record<string, THREE.Vector3>>({});

  useEffect(() => {
    // Clear the refs when nodes change to avoid memory leaks
    livePositionsRef.current = {};
  }, [nodes]);

  const {camera} = useThree()
  const controlsRef = useRef<any>(null)

  const visibleNodes = useMemo(() => {
    return Object.values(nodes).filter(node => {
        if (!nodeFilters[node.type]) {
            return false;
        }
        if (isTimelineActive && node.type === 'book') {
            if (!node.publicationYear) return false;
            return node.publicationYear >= timelineRange.start && node.publicationYear <= timelineRange.end;
        }
        return true;
    });
  }, [nodes, nodeFilters, isTimelineActive, timelineRange]);

  const visibleNodeIds = useMemo(() => new Set(visibleNodes.map(n => n.id)), [visibleNodes]);

  const visibleEdges = useMemo(() => {
    return edges.filter(edge => visibleNodeIds.has(edge.source) && visibleNodeIds.has(edge.target));
  }, [edges, visibleNodeIds]);

  const connections = useMemo(() => {
    const map = new Map<string, string[]>();
    Object.keys(nodes).forEach(id => map.set(id, []));
    edges.forEach(edge => {
        map.get(edge.source)?.push(edge.target);
        map.get(edge.target)?.push(edge.source);
    });
    return map;
  }, [edges, nodes]);

  useEffect(() => {
    if (selectedNode && nodes[selectedNode] && !nodeFilters[nodes[selectedNode].type]) {
      setSelectedNode(null);
    }
  }, [selectedNode, nodeFilters, nodes]);


  useEffect(() => {
    const controls = controlsRef.current
    if (!controls) return

    if (selectedNode && nodes[selectedNode]) {
      const node = nodes[selectedNode]
      const nodePos = node.position
      const targetNodeWorldVec = new THREE.Vector3(...nodePos)

      const size = node.size || 0.7;
      const effectiveSize = size * (node.type === 'book' || node.type === 'author' ? 1.4 : 1);
      const cameraDistance = Math.max(effectiveSize * 6, 5);


      const duration = 2.5;
      const ease = 'easeInOut'

      // @ts-ignore - motion library type issue
      const currentControlsTarget = controls.target.clone()
      // @ts-expect-error - motion library type mismatch
      animate(
        (t: number) => {
          const newTarget = new THREE.Vector3().lerpVectors(
            currentControlsTarget,
            targetNodeWorldVec,
            t
          )
          controls.target.set(newTarget.x, newTarget.y, newTarget.z)
        },
        {duration, ease: ease as any}
      )

      const offsetDirection = camera.position
        .clone()
        .sub(controls.target)
        .normalize()
        .multiplyScalar(cameraDistance)

      const targetCameraPositionVec = targetNodeWorldVec
        .clone()
        .add(offsetDirection)
      // @ts-ignore - motion library type issue
      const currentCameraPosition = camera.position.clone()

      // @ts-expect-error - motion library type mismatch
      animate(
        (t: number) => {
          const newPos = new THREE.Vector3().lerpVectors(
            currentCameraPosition,
            targetCameraPositionVec,
            t
          )
          camera.position.set(newPos.x, newPos.y, newPos.z)
        },
        {duration, ease: ease as any}
      )
    } else if (resetCam) {
      const targetCamPos: [number, number, number] = [0, 0, 50]
      const targetControlsTarget: [number, number, number] = [0, 0, 0]
      const duration = 1.2
      const ease = 'easeInOut'

      // @ts-ignore - motion library type issue
      const currentCamPos = camera.position.clone()
      const currentControlsTarget = controls.target.clone()

      // @ts-expect-error - motion library type mismatch
      animate(
        (t: number) => {
          const newPos = new THREE.Vector3().lerpVectors(
            currentCamPos,
            new THREE.Vector3(...targetCamPos),
            t
          )
          camera.position.set(newPos.x, newPos.y, newPos.z)
          const newTarget = new THREE.Vector3().lerpVectors(
            currentControlsTarget,
            new THREE.Vector3(...targetControlsTarget),
            t
          )
          controls.target.set(newTarget.x, newTarget.y, newTarget.z)
        },
        {duration, ease: ease as any}
      )
      const set = useStore.setState as any; set((state: any) => {
        state.resetCam = false
      })
    }
  }, [selectedNode, resetCam, nodes, camera, controlsRef])

  useFrame(() => {
    if (controlsRef.current) {
      controlsRef.current.update()
    }
  })

  const selectionActive = !!selectedNode;
  const pathActive = connectionPath.length > 0;

  const pathNodeIds = useMemo(() => new Set(connectionPath), [connectionPath]);
  const pathEdgeIds = useMemo(() => {
    const idSet = new Set<string>();
    for (let i = 0; i < connectionPath.length - 1; i++) {
        idSet.add(`${connectionPath[i]}->${connectionPath[i+1]}`);
        idSet.add(`${connectionPath[i+1]}->${connectionPath[i]}`);
    }
    return idSet;
  }, [connectionPath]);

  const selectedNodeData = useMemo(() => selectedNode ? nodes[selectedNode] : null, [selectedNode, nodes]);
  const selectedNodePosition = selectedNodeData ? selectedNodeData.position : undefined;


  return (
    <>
      <ambientLight intensity={1.5} />
      <pointLight position={[100, 100, 100]} intensity={0.5} />
      <pointLight position={[-100, -100, -100]} intensity={0.3} />

      <TrackballControls
        ref={controlsRef}
        minDistance={5}
        maxDistance={100}
        noPan
      />
      <Physics gravity={[0, 0, 0]}>
        <Suspense fallback={null}>
            {visibleNodes.map(node => {
            const isConnected = selectedNode && edges.some(edge =>
              (edge.source === selectedNode && edge.target === node.id) ||
              (edge.target === selectedNode && edge.source === node.id)
            );

            let isHighlightedNeighbor = false;
            if (selectedNode && isConnected) {
              if (selectedNodeData?.type === 'author') {
                if (node.type === 'book' || node.type === 'author') {
                  isHighlightedNeighbor = true;
                }
              } else {
                isHighlightedNeighbor = true;
              }
            }

            const isInPath = pathActive && pathNodeIds.has(node.id);
            const isDimmedByPath = pathActive && !isInPath;
            const isDimmedBySelection = !pathActive && selectedNode && selectedNode !== node.id && !isHighlightedNeighbor;

            let authorWithImage = null;
            if (node.type === 'book') {
                const connectedNodeIds = connections.get(node.id) || [];
                for (const connectedId of connectedNodeIds) {
                    const connectedNode = nodes[connectedId];
                    if (connectedNode && connectedNode.type === 'author' && connectedNode.imageUrl) {
                        authorWithImage = connectedNode;
                        break;
                    }
                }
            }

            return (<LiteraryNode
                key={node.id}
                {...node}
                highlight={selectedNode === node.id}
                isExpanding={expandingNodeId === node.id}
                dim={isDimmedBySelection || isDimmedByPath}
                selectionActive={selectionActive}
                isInPath={isInPath}
                authorWithImage={authorWithImage}
                selectedNodePosition={selectedNodePosition}
                livePositionsRef={livePositionsRef}
            />
            )})}
        </Suspense>
        {visibleEdges.map((edge, i) => {
          const sourceNode = nodes[edge.source]
          const targetNode = nodes[edge.target]
          if (!sourceNode || !targetNode) return null;

          const isPathEdge = pathActive && pathEdgeIds.has(`${edge.source}->${edge.target}`);
          const isConnectedToSelected = selectedNode && (edge.source === selectedNode || edge.target === selectedNode);
          const isDimmed = (selectedNode && !isConnectedToSelected) || (pathActive && !isPathEdge);

          const isThemeConnection = sourceNode.type === 'theme' || targetNode.type === 'theme';
          const themeColor = '#2dd4bf';

          let opacity = 0.1;
          let lineWidth = 0.5;
          let color = isThemeConnection ? themeColor : "#aaa";

          if (isPathEdge) {
            opacity = 0.8;
            lineWidth = 2.5;
            color = isThemeConnection ? themeColor : "white";
          } else if (isConnectedToSelected && !pathActive) {
            opacity = 0.8;
            lineWidth = 2.0;
            color = isThemeConnection ? themeColor : "white";
          } else if (isDimmed) {
            opacity = 0.02;
          } else if (isThemeConnection) {
            opacity = 0.3;
          }

          return (
            <GraphEdge
              key={`${edge.source}-${edge.target}-${i}`}
              sourceId={edge.source}
              targetId={edge.target}
              livePositions={livePositionsRef}
              color={color}
              lineWidth={lineWidth}
              transparent
              opacity={opacity}
            />
          )
        })}
      </Physics>
    </>
  )
}

export default function GraphViz() {
  return (
    <Canvas
      camera={{position: [0, 0, 50], near: 0.1, far: 1000}}
      onPointerMissed={() => {
        if (useStore.getState().connectionMode === 'inactive') {
          setSelectedNode(null);
        }
      }}
      shadows
    >
        <SceneContent />
    </Canvas>
  )
}
