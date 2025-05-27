// Three.js variables
let scene, camera, renderer, controls;
let reactorModel, reactantParticles = [], productParticles = [];
let particleGroup, arrowGroup;
let currentReactionType = 'exothermic';

// System state
let systemState = {
    temperature: 25,
    pressure: 1,
    reactantConc: 50,
    productConc: 50,
    equilibriumShift: 0, // -100 to 100 (left to right)
    equilibriumStatus: 'balanced'
};

// Main application
document.addEventListener('DOMContentLoaded', function() {
    // Remove loading screen after everything is ready
    setTimeout(() => {
        document.querySelector('.loading').style.display = 'none';
    }, 1500);

    // Initialize the 3D visualization
    initReactorVisualization();
    
    // Set up event listeners for controls
    setupEventListeners();
    
    // Initial update
    updateSystem();
});

function initReactorVisualization() {
    const container = document.getElementById('reactor-viz');
    
    // Scene setup
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf0f2f5);
    
    // Camera setup
    camera = new THREE.PerspectiveCamera(75, container.clientWidth / container.clientHeight, 0.1, 1000);
    camera.position.set(0, 0, 30);
    
    // Renderer setup
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.shadowMap.enabled = true;
    container.appendChild(renderer.domElement);
    
    // Controls
    controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.25;
    controls.minDistance = 15;
    controls.maxDistance = 50;
    
    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);
    
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(5, 10, 7);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 1024;
    directionalLight.shadow.mapSize.height = 1024;
    scene.add(directionalLight);
    
    // Create reactor vessel
    createReactorVessel();
    
    // Create initial particles
    createParticles();
    
    // Create reaction arrow
    createReactionArrow();
    
    // Handle window resize
    window.addEventListener('resize', onWindowResize);
    
    // Start animation loop
    animate();
}

function createReactorVessel() {
    // Reactor base
    const baseGeometry = new THREE.CylinderGeometry(8, 8, 1, 32);
    const baseMaterial = new THREE.MeshPhongMaterial({ 
        color: 0x95a5a6,
        metalness: 0.3,
        roughness: 0.7
    });
    const base = new THREE.Mesh(baseGeometry, baseMaterial);
    base.position.y = -5;
    base.receiveShadow = true;
    scene.add(base);
    
    // Reactor chamber (glass)
    const chamberGeometry = new THREE.CylinderGeometry(6, 6, 10, 32);
    const chamberMaterial = new THREE.MeshPhysicalMaterial({
        color: 0x88ccee,
        transmission: 0.9,
        roughness: 0.1,
        metalness: 0.0,
        clearcoat: 1.0,
        clearcoatRoughness: 0.1,
        ior: 1.33,
        thickness: 0.5,
        envMapIntensity: 1,
        transparent: true,
        opacity: 0.7
    });
    const chamber = new THREE.Mesh(chamberGeometry, chamberMaterial);
    chamber.position.y = 2;
    chamber.castShadow = true;
    chamber.receiveShadow = true;
    scene.add(chamber);
    
    // Reactor top
    const topGeometry = new THREE.CylinderGeometry(6.5, 6.5, 0.5, 32);
    const topMaterial = new THREE.MeshPhongMaterial({ 
        color: 0x7f8c8d,
        metalness: 0.5,
        roughness: 0.5
    });
    const top = new THREE.Mesh(topGeometry, topMaterial);
    top.position.y = 7.25;
    top.castShadow = true;
    scene.add(top);
    
    // Temperature gauge
    createTemperatureGauge();
}

function createParticles() {
    // Clear existing particles
    if (particleGroup) {
        scene.remove(particleGroup);
    }
    
    particleGroup = new THREE.Group();
    
    // Create reactant particles (red)
    const reactantCount = Math.floor(systemState.reactantConc / 5);
    const reactantColor = new THREE.Color(0xff4444);
    
    for (let i = 0; i < reactantCount; i++) {
        const size = 0.3 + Math.random() * 0.2;
        const geometry = new THREE.SphereGeometry(size, 16, 16);
        const material = new THREE.MeshPhongMaterial({
            color: reactantColor,
            emissive: 0x220000,
            emissiveIntensity: 0.2,
            shininess: 30
        });
        
        const particle = new THREE.Mesh(geometry, material);
        
        // Position in left side of reactor
        particle.position.set(
            -3 + Math.random() * 2,
            -3 + Math.random() * 6,
            -2 + Math.random() * 4
        );
        
        particle.castShadow = true;
        particle.userData = { type: 'reactant', velocity: new THREE.Vector3() };
        particleGroup.add(particle);
        reactantParticles.push(particle);
    }
    
    // Create product particles (blue)
    const productCount = Math.floor(systemState.productConc / 5);
    const productColor = new THREE.Color(0x4444ff);
    
    for (let i = 0; i < productCount; i++) {
        const size = 0.3 + Math.random() * 0.2;
        const geometry = new THREE.SphereGeometry(size, 16, 16);
        const material = new THREE.MeshPhongMaterial({
            color: productColor,
            emissive: 0x000022,
            emissiveIntensity: 0.2,
            shininess: 30
        });
        
        const particle = new THREE.Mesh(geometry, material);
        
        // Position in right side of reactor
        particle.position.set(
            3 + Math.random() * 2,
            -3 + Math.random() * 6,
            -2 + Math.random() * 4
        );
        
        particle.castShadow = true;
        particle.userData = { type: 'product', velocity: new THREE.Vector3() };
        particleGroup.add(particle);
        productParticles.push(particle);
    }
    
    scene.add(particleGroup);
}

function createReactionArrow() {
    if (arrowGroup) {
        scene.remove(arrowGroup);
    }
    
    arrowGroup = new THREE.Group();
    
    // Arrow line
    const points = [];
    for (let i = 0; i <= 20; i++) {
        const t = i / 20;
        const x = -5 + t * 10;
        const y = 0.5 * Math.sin(t * Math.PI);
        points.push(new THREE.Vector3(x, y, 0));
    }
    
    const lineGeometry = new THREE.BufferGeometry().setFromPoints(points);
    const lineMaterial = new THREE.LineBasicMaterial({ color: 0x00aa00, linewidth: 2 });
    const line = new THREE.Line(lineGeometry, lineMaterial);
    arrowGroup.add(line);
    
    // Arrow head
    const headGeometry = new THREE.ConeGeometry(0.3, 1, 16);
    const headMaterial = new THREE.MeshBasicMaterial({ color: 0x00aa00 });
    const head = new THREE.Mesh(headGeometry, headMaterial);
    head.position.set(5, 0, 0);
    head.rotation.z = Math.PI / 2;
    arrowGroup.add(head);
    
    // Position above reactor
    arrowGroup.position.y = 8;
    
    scene.add(arrowGroup);
}

function createTemperatureGauge() {
    const gaugeGroup = new THREE.Group();
    
    // Gauge base
    const baseGeometry = new THREE.CylinderGeometry(1.5, 1.5, 0.3, 32);
    const baseMaterial = new THREE.MeshPhongMaterial({ color: 0x333333 });
    const base = new THREE.Mesh(baseGeometry, baseMaterial);
    base.position.set(10, 0, 0);
    gaugeGroup.add(base);
    
    // Gauge face
    const faceGeometry = new THREE.CylinderGeometry(1.4, 1.4, 0.2, 32);
    const faceMaterial = new THREE.MeshPhongMaterial({ color: 0xffffff });
    const face = new THREE.Mesh(faceGeometry, faceMaterial);
    face.position.set(10, 0.15, 0);
    gaugeGroup.add(face);
    
    // Gauge needle
    const needleGeometry = new THREE.BoxGeometry(1.3, 0.1, 0.1);
    const needleMaterial = new THREE.MeshPhongMaterial({ color: 0xff0000 });
    const needle = new THREE.Mesh(needleGeometry, needleMaterial);
    needle.position.set(10, 0.15, 0);
    needle.rotation.z = -Math.PI / 4; // Start at 25°C position
    gaugeGroup.add(needle);
    
    // Store reference to needle for animation
    gaugeGroup.userData = { needle };
    
    scene.add(gaugeGroup);
}

function updateTemperatureGauge(temp) {
    // Find gauge in scene
    scene.children.forEach(child => {
        if (child.userData.needle) {
            // Map temperature to needle rotation (-45° to 45° for 0-200°C)
            const rotation = -Math.PI/4 + (temp / 200) * (Math.PI/2);
            child.userData.needle.rotation.z = rotation;
        }
    });
}

function onWindowResize() {
    const container = document.getElementById('reactor-viz');
    camera.aspect = container.clientWidth / container.clientHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(container.clientWidth, container.clientHeight);
}

function animate() {
    requestAnimationFrame(animate);
    
    // Update controls
    controls.update();
    
    // Animate particles based on system state
    animateParticles();
    
    // Render scene
    renderer.render(scene, camera);
}

function animateParticles() {
    const speedFactor = 0.02;
    const temperatureEffect = systemState.temperature / 50;
    const shiftDirection = systemState.equilibriumShift / 100;
    
    particleGroup.children.forEach(particle => {
        // Random motion
        particle.userData.velocity.x += (Math.random() - 0.5) * 0.1 * temperatureEffect;
        particle.userData.velocity.y += (Math.random() - 0.5) * 0.1 * temperatureEffect;
        particle.userData.velocity.z += (Math.random() - 0.5) * 0.1 * temperatureEffect;
        
        // Apply shift direction based on equilibrium
        if (particle.userData.type === 'reactant') {
            particle.userData.velocity.x += shiftDirection * speedFactor;
        } else {
            particle.userData.velocity.x -= shiftDirection * speedFactor;
        }
        
        // Apply velocity
        particle.position.x += particle.userData.velocity.x;
        particle.position.y += particle.userData.velocity.y;
        particle.position.z += particle.userData.velocity.z;
        
        // Damping
        particle.userData.velocity.multiplyScalar(0.95);
        
        // Boundary checks (reactor walls)
        const radius = 6;
        const height = 10;
        const centerY = 2;
        
        // Check X bounds
        if (Math.abs(particle.position.x) > radius - 1) {
            particle.position.x = Math.sign(particle.position.x) * (radius - 1);
            particle.userData.velocity.x *= -0.5;
        }
        
        // Check Y bounds
        if (particle.position.y > centerY + height/2 - 1 || 
            particle.position.y < centerY - height/2 + 1) {
            particle.position.y = Math.min(
                Math.max(particle.position.y, centerY - height/2 + 1), 
                centerY + height/2 - 1
            );
            particle.userData.velocity.y *= -0.5;
        }
        
        // Check Z bounds
        if (Math.abs(particle.position.z) > radius - 1) {
            particle.position.z = Math.sign(particle.position.z) * (radius - 1);
            particle.userData.velocity.z *= -0.5;
        }
    });
}

function setupEventListeners() {
    // Reaction type selector
    document.getElementById('reactionType').addEventListener('change', function() {
        currentReactionType = this.value;
        updateReactionEquation();
        updateSystem();
    });
    
    // Sliders
    document.getElementById('temperature').addEventListener('input', function() {
        document.getElementById('tempValue').textContent = this.value + '°C';
        systemState.temperature = parseFloat(this.value);
        updateSystem();
    });
    
    document.getElementById('pressure').addEventListener('input', function() {
        document.getElementById('pressureValue').textContent = this.value + ' atm';
        systemState.pressure = parseFloat(this.value);
        updateSystem();
    });
    
    document.getElementById('reactantConcentration').addEventListener('input', function() {
        document.getElementById('reactantValue').textContent = this.value + '%';
        systemState.reactantConc = parseFloat(this.value);
        updateSystem();
    });
    
    document.getElementById('productConcentration').addEventListener('input', function() {
        document.getElementById('productValue').textContent = this.value + '%';
        systemState.productConc = parseFloat(this.value);
        updateSystem();
    });
    
    // Reset button
    document.getElementById('resetBtn').addEventListener('click', function() {
        resetToEquilibrium();
    });
}

function updateSystem() {
    // Calculate equilibrium shift based on current conditions
    calculateEquilibriumShift();
    
    // Update particle visualization
    createParticles();
    
    // Update temperature gauge
    updateTemperatureGauge(systemState.temperature);
    
    // Update status display
    updateStatusDisplay();
}

function calculateEquilibriumShift() {
    let shift = 0;
    
    // Concentration effect
    shift += (systemState.reactantConc - systemState.productConc) * 0.2;
    
    // Temperature effect based on reaction type
    if (currentReactionType === 'exothermic') {
        // For exothermic reactions, heat is a product
        shift += (25 - systemState.temperature) * 0.1;
    } else if (currentReactionType === 'endothermic') {
        // For endothermic reactions, heat is a reactant
        shift += (systemState.temperature - 25) * 0.1;
    } else if (currentReactionType === 'gas') {
        // For gas reactions, pressure affects equilibrium
        shift += (1 - systemState.pressure) * 0.5;
    } else if (currentReactionType === 'dissolution') {
        // For dissolution, temperature has different effect
        shift += (systemState.temperature - 25) * 0.05;
    }
    
    // Pressure effect for gas phase reactions
    if (currentReactionType === 'gas') {
        shift += (1 - systemState.pressure) * 0.3;
    }
    
    // Clamp shift between -100 and 100
    systemState.equilibriumShift = Math.max(-100, Math.min(100, shift));
    
    // Determine equilibrium status
    if (systemState.equilibriumShift > 20) {
        systemState.equilibriumStatus = 'right';
    } else if (systemState.equilibriumShift < -20) {
        systemState.equilibriumStatus = 'left';
    } else {
        systemState.equilibriumStatus = 'balanced';
    }
}

function updateReactionEquation() {
    const equationElement = document.getElementById('reactionEquation');
    
    switch(currentReactionType) {
        case 'exothermic':
            equationElement.textContent = 'A + B ⇌ C + Heat';
            break;
        case 'endothermic':
            equationElement.textContent = 'A + B + Heat ⇌ C';
            break;
        case 'gas':
            equationElement.textContent = '2A(g) + B(g) ⇌ C(g)';
            break;
        case 'dissolution':
            equationElement.textContent = 'Solid ⇌ Aqueous Solution';
            break;
        default:
            equationElement.textContent = 'A + B ⇌ C';
    }
}

function updateStatusDisplay() {
    const statusLight = document.getElementById('statusLight');
    const statusText = document.getElementById('statusText');
    const explanationText = document.getElementById('equilibriumExplanation');
    
    switch(systemState.equilibriumStatus) {
        case 'right':
            statusLight.style.background = '#00aa00';
            statusText.textContent = 'Shift to Products (Right)';
            explanationText.textContent = getRightShiftExplanation();
            break;
        case 'left':
            statusLight.style.background = '#aa0000';
            statusText.textContent = 'Shift to Reactants (Left)';
            explanationText.textContent = getLeftShiftExplanation();
            break;
        default:
            statusLight.style.background = '#ffaa00';
            statusText.textContent = 'System at Equilibrium';
            explanationText.textContent = 'The concentrations of reactants and products are stable. No net shift occurring.';
    }
}

function getRightShiftExplanation() {
    let explanation = 'The system is shifting to produce more products because: ';
    const reasons = [];
    
    if (systemState.reactantConc > systemState.productConc) {
        reasons.push('reactant concentration is high');
    }
    
    if (currentReactionType === 'exothermic' && systemState.temperature < 25) {
        reasons.push('temperature is low (heat is a product)');
    } else if (currentReactionType === 'endothermic' && systemState.temperature > 25) {
        reasons.push('temperature is high (heat is a reactant)');
    }
    
    if (currentReactionType === 'gas' && systemState.pressure < 1) {
        reasons.push('pressure is low (favors side with more gas molecules)');
    }
    
    return explanation + reasons.join(', ') + '.';
}

function getLeftShiftExplanation() {
    let explanation = 'The system is shifting to produce more reactants because: ';
    const reasons = [];
    
    if (systemState.productConc > systemState.reactantConc) {
        reasons.push('product concentration is high');
    }
    
    if (currentReactionType === 'exothermic' && systemState.temperature > 25) {
        reasons.push('temperature is high (heat is a product)');
    } else if (currentReactionType === 'endothermic' && systemState.temperature < 25) {
        reasons.push('temperature is low (heat is a reactant)');
    }
    
    if (currentReactionType === 'gas' && systemState.pressure > 1) {
        reasons.push('pressure is high (favors side with fewer gas molecules)');
    }
    
    return explanation + reasons.join(', ') + '.';
}

function resetToEquilibrium() {
    // Reset sliders to equilibrium values
    document.getElementById('temperature').value = 25;
    document.getElementById('tempValue').textContent = '25°C';
    systemState.temperature = 25;
    
    document.getElementById('pressure').value = 1;
    document.getElementById('pressureValue').textContent = '1 atm';
    systemState.pressure = 1;
    
    document.getElementById('reactantConcentration').value = 50;
    document.getElementById('reactantValue').textContent = '50%';
    systemState.reactantConc = 50;
    
    document.getElementById('productConcentration').value = 50;
    document.getElementById('productValue').textContent = '50%';
    systemState.productConc = 50;
    
    // Update system
    updateSystem();
}