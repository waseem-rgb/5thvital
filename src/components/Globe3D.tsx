import { useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Sphere, Box } from '@react-three/drei';
import * as THREE from 'three';

// Animated Earth component
const AnimatedEarth = () => {
  const meshRef = useRef<THREE.Mesh>(null);
  const materialRef = useRef<THREE.ShaderMaterial>(null);

  useFrame((state) => {
    if (meshRef.current) {
      // Continuous rotation
      meshRef.current.rotation.y += 0.01;
      meshRef.current.rotation.x += 0.005;
    }
    
    if (materialRef.current) {
      // Update time uniform for dynamic colors
      materialRef.current.uniforms.time.value = state.clock.elapsedTime;
    }
  });

  const vertexShader = `
    varying vec3 vPosition;
    varying vec3 vNormal;
    varying vec2 vUv;
    
    void main() {
      vPosition = position;
      vNormal = normal;
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `;

  const fragmentShader = `
    uniform float time;
    varying vec3 vPosition;
    varying vec3 vNormal;
    varying vec2 vUv;
    
    // Advanced noise functions
    float hash(vec2 p) {
      return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
    }
    
    float noise(vec2 p) {
      vec2 i = floor(p);
      vec2 f = fract(p);
      vec2 u = f * f * (3.0 - 2.0 * f);
      return mix(mix(hash(i + vec2(0.0, 0.0)), hash(i + vec2(1.0, 0.0)), u.x),
                 mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
    }
    
    float fbm(vec2 p) {
      float value = 0.0;
      float amplitude = 0.5;
      for (int i = 0; i < 5; i++) {
        value += amplitude * noise(p);
        p *= 2.0;
        amplitude *= 0.5;
      }
      return value;
    }
    
    // Realistic Earth continent mapping
    float getEarthLandMask(vec2 uv) {
      // Convert UV to longitude/latitude
      float lon = (uv.x - 0.5) * 6.28318; // -PI to PI
      float lat = (uv.y - 0.5) * 3.14159; // -PI/2 to PI/2
      
      float landMask = 0.0;
      
      // Africa
      vec2 africaCenter = vec2(0.55, 0.65);
      float africaDist = length(uv - africaCenter);
      float africaShape = smoothstep(0.35, 0.1, africaDist);
      // Make Africa more elongated vertically
      africaShape *= smoothstep(0.25, 0.05, abs(uv.x - 0.55)) * smoothstep(0.4, 0.1, abs(uv.y - 0.65));
      
      // Europe
      vec2 europeCenter = vec2(0.52, 0.25);
      float europeDist = length(uv - europeCenter);
      float europeShape = smoothstep(0.15, 0.03, europeDist);
      
      // Asia
      vec2 asiaCenter = vec2(0.75, 0.35);
      float asiaDist = length(uv - asiaCenter);
      float asiaShape = smoothstep(0.3, 0.08, asiaDist);
      // Extend Asia horizontally
      asiaShape *= smoothstep(0.35, 0.1, abs(uv.x - 0.75)) * smoothstep(0.25, 0.05, abs(uv.y - 0.35));
      
      // North America
      vec2 nAmericaCenter = vec2(0.15, 0.25);
      float nAmericaDist = length(uv - nAmericaCenter);
      float nAmericaShape = smoothstep(0.25, 0.05, nAmericaDist);
      
      // South America
      vec2 sAmericaCenter = vec2(0.22, 0.75);
      float sAmericaDist = length(uv - sAmericaCenter);
      float sAmericaShape = smoothstep(0.2, 0.04, sAmericaDist);
      // Make South America more elongated
      sAmericaShape *= smoothstep(0.15, 0.03, abs(uv.x - 0.22)) * smoothstep(0.3, 0.08, abs(uv.y - 0.75));
      
      // Australia
      vec2 australiaCenter = vec2(0.85, 0.8);
      float australiaDist = length(uv - australiaCenter);
      float australiaShape = smoothstep(0.08, 0.02, australiaDist);
      
      // Greenland
      vec2 greenlandCenter = vec2(0.3, 0.15);
      float greenlandDist = length(uv - greenlandCenter);
      float greenlandShape = smoothstep(0.1, 0.02, greenlandDist);
      
      // Combine all continents
      landMask = max(max(max(africaShape, europeShape), max(asiaShape, nAmericaShape)), 
                     max(max(sAmericaShape, australiaShape), greenlandShape));
      
      // Add coastal variation with multiple noise octaves
      float coastalNoise = fbm(uv * 25.0) * 0.4 + fbm(uv * 50.0) * 0.2;
      landMask = smoothstep(0.3, 0.7, landMask + coastalNoise * 0.3);
      
      return clamp(landMask, 0.0, 1.0);
    }
    
    void main() {
      vec2 uv = vUv;
      
      // Get land/ocean mask
      float landMask = getEarthLandMask(uv);
      
      // Realistic ocean colors - much lighter and softer tones
      vec3 oceanDeep = vec3(0.4, 0.55, 0.75);     // Much lighter deep ocean blue
      vec3 oceanMid = vec3(0.5, 0.65, 0.85);      // Lighter mid ocean blue  
      vec3 oceanShallow = vec3(0.6, 0.75, 0.9);   // Very light shallow water blue
      
      float oceanDepth = fbm(uv * 8.0 + time * 0.05);
      vec3 oceanColor = mix(mix(oceanDeep, oceanMid, oceanDepth), oceanShallow, oceanDepth * 0.3);
      
      // Realistic land colors with variation - much lighter
      vec3 landForest = vec3(0.4, 0.65, 0.4);     // Light green forests
      vec3 landGrass = vec3(0.5, 0.75, 0.45);     // Light grasslands
      vec3 landDesert = vec3(0.85, 0.75, 0.55);   // Light desert sand
      vec3 landMountain = vec3(0.65, 0.55, 0.5);  // Light mountain brown
      vec3 landSnow = vec3(0.95, 0.97, 1.0);      // Snow caps
      
      // Create terrain variation
      float terrainNoise = fbm(uv * 15.0 + time * 0.02);
      float elevationNoise = fbm(uv * 8.0);
      
      vec3 landColor;
      if (elevationNoise > 0.7) {
        // High elevation - mountains/snow
        landColor = mix(landMountain, landSnow, (elevationNoise - 0.7) / 0.3);
      } else if (terrainNoise > 0.6) {
        // Desert regions
        landColor = landDesert;
      } else if (terrainNoise > 0.3) {
        // Grasslands
        landColor = landGrass;
      } else {
        // Forests
        landColor = landForest;
      }
      
      // Mix ocean and land
      vec3 earthColor = mix(oceanColor, landColor, landMask);
      
      // Add realistic cloud layer
      float cloudPattern = fbm(uv * 4.0 + time * 0.08);
      float cloudDensity = fbm(uv * 8.0 - time * 0.1);
      float cloudMask = smoothstep(0.4, 0.8, cloudPattern * cloudDensity);
      
      vec3 cloudColor = vec3(0.95, 0.95, 0.98);
      earthColor = mix(earthColor, cloudColor, cloudMask * 0.6);
      
      // Realistic lighting with day/night terminator - softer lighting
      vec3 lightDir = normalize(vec3(1.0, 0.5, 1.0));
      float NdotL = dot(vNormal, lightDir);
      float lighting = clamp(NdotL * 0.5 + 0.5, 0.2, 1.0);  // Softer lighting with higher base
      
      // Add subtle rim lighting for atmosphere - lighter
      float rimLight = 1.0 - abs(dot(vNormal, vec3(0.0, 0.0, 1.0)));
      rimLight = pow(rimLight, 2.0);
      vec3 atmosphereColor = vec3(0.7, 0.85, 1.0);  // Much lighter atmosphere
      
      // Apply lighting
      earthColor *= lighting;
      earthColor = mix(earthColor, atmosphereColor, rimLight * 0.1);  // Reduced intensity
      
      // Add slight blue atmosphere glow - reduced
      earthColor += atmosphereColor * rimLight * 0.05;
      
      gl_FragColor = vec4(earthColor, 1.0);
    }
  `;

  return (
    <Sphere ref={meshRef} args={[1.2, 64, 64]}>
      <shaderMaterial
        ref={materialRef}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        uniforms={{
          time: { value: 0 }
        }}
      />
    </Sphere>
  );
};

// Static connection dots
const ConnectionDot = ({ position }: { position: [number, number, number] }) => {
  return (
    <Box position={position} args={[0.03, 0.03, 0.03]}>
      <meshBasicMaterial color="#000000" />
    </Box>
  );
};

// Generate dot positions around the sphere
const generateDotPositions = (count: number, radius: number) => {
  const positions: [number, number, number][] = [];
  
  for (let i = 0; i < count; i++) {
    const phi = Math.random() * Math.PI * 2;
    const theta = Math.random() * Math.PI;
    const r = radius + Math.random() * 0.5;
    
    const x = r * Math.sin(theta) * Math.cos(phi);
    const y = r * Math.sin(theta) * Math.sin(phi);
    const z = r * Math.cos(theta);
    
    positions.push([x, y, z]);
  }
  
  return positions;
};

const Globe3D = () => {
  const dotPositions = generateDotPositions(8, 2.0);

  return (
    <Canvas
      camera={{ position: [0, 0, 4], fov: 50 }}
      style={{ width: '100%', height: '100%' }}
    >
      <ambientLight intensity={0.6} />
      <pointLight position={[10, 10, 10]} intensity={1} />
      <pointLight position={[-10, -10, -10]} intensity={0.5} />
      
      {/* Main animated earth */}
      <AnimatedEarth />
      
      {/* Static connection dots */}
      {dotPositions.map((position, index) => (
        <ConnectionDot 
          key={index} 
          position={position} 
        />
      ))}
    </Canvas>
  );
};

export default Globe3D;