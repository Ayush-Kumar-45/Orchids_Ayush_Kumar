
        let scene, camera, renderer, controls;
        let reactorMesh, liquidMesh;
        let particleGroup;
        let reactantParticles = [];
        let productParticles = [];
        let solidParticles = []; // For dissolution
        let aqueousParticles = []; // For dissolution
        let arrowGroup; // For reaction arrow
        const reactantColor = 0x3498db; // Blue
        const productColor = 0xe74c3c; // Red
        const solidColor = 0x95a5a6;    // Greyish
        const aqueousColor = 0x2ecc71;  
        const reactorColor = 0x7f8c8d;  
        const liquidColor = 0xecf0f1;   

        const chamberRadius = 7.5;
        const chamberHeight = 11;
        const chamberCenterY = 3; 
        const systemState = {
            temperature: 25, 
            pressure: 1,    
            reactantConc: 50, 
            productConc: 50, 
            equilibriumShift: 0, 
            equilibriumStatus: 'balanced'
        };

        let currentReactionType = 'exothermic'; // Default reaction type
        let observations = [];
        const MAX_OBSERVATIONS = 10; // Max number of observations to keep in table
        function speak(text, delay = 0) {
            if ('speechSynthesis' in window) {
                setTimeout(() => {
                    const utterance = new SpeechSynthesisUtterance(text);
                    utterance.lang = 'en-US'; // Set language
                    speechSynthesis.speak(utterance);
                }, delay);
            } else {
                console.warn('Speech Synthesis not supported in this browser.');
            }
        }
        function init() {
            const container = document.getElementById('reactor-viz');
            if (!container) {
                console.error("Reactor visualization container not found.");
                return;
            }

            // Scene
            scene = new THREE.Scene();
            scene.background = new THREE.Color(0xe0e6ec); // Match panel background
            camera = new THREE.PerspectiveCamera(75, container.clientWidth / container.clientHeight, 0.1, 1000);
            camera.position.set(0, 10, 30); // Adjust camera to see more
            renderer = new THREE.WebGLRenderer({ antialias: true });
            renderer.setSize(container.clientWidth, container.clientHeight);
            renderer.setPixelRatio(window.devicePixelRatio);
            renderer.shadowMap.enabled = true;
            renderer.shadowMap.type = THREE.PCFSoftShadowMap; // Softer shadows
            container.appendChild(renderer.domElement);
            controls = new THREE.OrbitControls(camera, renderer.domElement);
            controls.enableDamping = true; // For a smoother orbiting experience
            controls.dampingFactor = 0.05;
            controls.screenSpacePanning = false;
            controls.minDistance = 15;
            controls.maxDistance = 50;
            controls.maxPolarAngle = Math.PI / 2; // Prevent camera from going below ground

            // Lighting
            const ambientLight = new THREE.AmbientLight(0x404040, 1); // Soft ambient light
            scene.add(ambientLight);

            const directionalLight = new THREE.DirectionalLight(0xffffff, 1.5);
            directionalLight.position.set(10, 20, 15);
            directionalLight.castShadow = true;
            directionalLight.shadow.mapSize.width = 1024;
            directionalLight.shadow.mapSize.height = 1024;
            directionalLight.shadow.camera.near = 0.5;
            directionalLight.shadow.camera.far = 50;
            directionalLight.shadow.camera.left = -15;
            directionalLight.shadow.camera.right = 15;
            directionalLight.shadow.camera.top = 15;
            directionalLight.shadow.camera.bottom = -15;
            scene.add(directionalLight);

            createReactor();
            createReactionArrow();
            createTemperatureGauge();
            updateTemperatureGauge(systemState.temperature); // Set initial gauge position
            setupEventListeners();
            updateReactionEquation(); // Set initial equation and particle type
            updateSystem(); // Initial calculation

            window.addEventListener('resize', onWindowResize);

            animate();

            speak("Welcome to the Le Chatelier's Principle Simulator. Please choose a reaction type from the dropdown.", 500); // 0.5 sec delay
            speak("You can then adjust the temperature, pressure, and reactant or product concentrations using the sliders.", 3000); // 3 sec delay
        }

        function createReactor() {
            if (reactorMesh) scene.remove(reactorMesh);
            if (liquidMesh) scene.remove(liquidMesh);

            const reactorGeometry = new THREE.CylinderGeometry(chamberRadius + 0.5, chamberRadius + 0.5, chamberHeight + 1, 32);
            const reactorMaterial = new THREE.MeshPhongMaterial({
                color: reactorColor,
                shininess: 50,
                specular: 0x555555,
                transparent: true,
                opacity: 0.2
            });
            reactorMesh = new THREE.Mesh(reactorGeometry, reactorMaterial);
            reactorMesh.position.y = chamberCenterY; // Center of the reactor
            reactorMesh.receiveShadow = true;
            scene.add(reactorMesh);

            const liquidGeometry = new THREE.CylinderGeometry(chamberRadius, chamberRadius, chamberHeight, 32);
            const liquidMaterial = new THREE.MeshPhongMaterial({
                color: liquidColor,
                shininess: 20,
                specular: 0x222222,
                transparent: true,
                opacity: 0.6 // Translucent liquid
            });
            liquidMesh = new THREE.Mesh(liquidGeometry, liquidMaterial);
            liquidMesh.position.y = chamberCenterY; // Center of the liquid column
            scene.add(liquidMesh);
        }

        function createParticles() {
            if (particleGroup) {
                scene.remove(particleGroup);
                particleGroup.children.forEach(child => child.geometry.dispose());
                particleGroup.children.forEach(child => child.material.dispose());
            }
            particleGroup = new THREE.Group();
            reactantParticles = [];
            productParticles = [];
            solidParticles = [];
            aqueousParticles = [];

            const totalParticles = 200; // Total number of particles in the simulation

            if (currentReactionType === 'exothermic' || currentReactionType === 'endothermic') {
                const reactantCount = Math.floor(systemState.reactantConc / 100 * totalParticles);
                const productCount = Math.floor(systemState.productConc / 100 * totalParticles);

                for (let i = 0; i < reactantCount; i++) {
                    const size = 0.3 + Math.random() * 0.2;
                    const geometry = new THREE.SphereGeometry(size, 16, 16);
                    const material = new THREE.MeshPhongMaterial({ color: reactantColor });
                    const particle = new THREE.Mesh(geometry, material);
                    particle.position.set(
                        (Math.random() - 0.5) * (chamberRadius * 1.8),
                        (Math.random() - 0.5) * chamberHeight + chamberCenterY,
                        (Math.random() - 0.5) * (chamberRadius * 1.8)
                    );
                    particle.castShadow = true;
                    particle.userData = {
                        type: 'reactant',
                        velocity: new THREE.Vector3(
                            (Math.random() - 0.5) * 0.1,
                            (Math.random() - 0.5) * 0.1,
                            (Math.random() - 0.5) * 0.1
                        )
                    };
                    particleGroup.add(particle);
                    reactantParticles.push(particle);
                }

                for (let i = 0; i < productCount; i++) {
                    const size = 0.3 + Math.random() * 0.2;
                    const geometry = new THREE.SphereGeometry(size, 16, 16);
                    const material = new THREE.MeshPhongMaterial({ color: productColor });
                    const particle = new THREE.Mesh(geometry, material);
                    particle.position.set(
                        (Math.random() - 0.5) * (chamberRadius * 1.8),
                        (Math.random() - 0.5) * chamberHeight + chamberCenterY,
                        (Math.random() - 0.5) * (chamberRadius * 1.8)
                    );
                    particle.castShadow = true;
                    particle.userData = {
                        type: 'product',
                        velocity: new THREE.Vector3(
                            (Math.random() - 0.5) * 0.1,
                            (Math.random() - 0.5) * 0.1,
                            (Math.random() - 0.5) * 0.1
                        )
                    };
                    particleGroup.add(particle);
                    productParticles.push(particle);
                }
            } else if (currentReactionType === 'gas') {
                const reactantCount = Math.floor(systemState.reactantConc / 100 * totalParticles);
                const productCount = Math.floor(systemState.productConc / 100 * totalParticles);
                for (let i = 0; i < reactantCount; i++) {
                    const size = 0.4 + Math.random() * 0.2; // Slightly larger for gas molecules
                    const geometry = new THREE.SphereGeometry(size, 16, 16);
                    const material = new THREE.MeshPhongMaterial({ color: reactantColor });
                    const particle = new THREE.Mesh(geometry, material);
                    particle.position.set(
                        (Math.random() - 0.5) * (chamberRadius * 1.8),
                        (Math.random() - 0.5) * chamberHeight + chamberCenterY,
                        (Math.random() - 0.5) * (chamberRadius * 1.8)
                    );
                    particle.castShadow = true;
                    particle.userData = {
                        type: 'reactant',
                        velocity: new THREE.Vector3(
                            (Math.random() - 0.5) * 0.15, // Faster movement for gas
                            (Math.random() - 0.5) * 0.15,
                            (Math.random() - 0.5) * 0.15
                        )
                    };
                    particleGroup.add(particle);
                    reactantParticles.push(particle);
                }
                for (let i = 0; i < productCount; i++) {
                    const size = 0.5 + Math.random() * 0.3;
                    const geometry = new THREE.SphereGeometry(size, 16, 16);
                    const material = new THREE.MeshPhongMaterial({ color: productColor });
                    const particle = new THREE.Mesh(geometry, material);
                    particle.position.set(
                        (Math.random() - 0.5) * (chamberRadius * 1.8),
                        (Math.random() - 0.5) * chamberHeight + chamberCenterY,
                        (Math.random() - 0.5) * (chamberRadius * 1.8)
                    );
                    particle.castShadow = true;
                    particle.userData = {
                        type: 'product',
                        velocity: new THREE.Vector3(
                            (Math.random() - 0.5) * 0.15, // Faster movement for gas
                            (Math.random() - 0.5) * 0.15,
                            (Math.random() - 0.5) * 0.15
                        )
                    };
                    particleGroup.add(particle);
                    productParticles.push(particle);
                }

            } else if (currentReactionType === 'dissolution') {
                const solidCount = Math.floor(systemState.reactantConc / 100 * totalParticles);
                const aqueousCount = Math.floor(systemState.productConc / 100 * totalParticles);
                for (let i = 0; i < solidCount; i++) {
                    const size = 0.5 + Math.random() * 0.5;
                    const geometry = new THREE.BoxGeometry(size, size, size); // Represent solid as cubes
                    const material = new THREE.MeshPhongMaterial({ color: solidColor });
                    const particle = new THREE.Mesh(geometry, material);
                    const angle = Math.random() * Math.PI * 2;
                    const r = Math.random() * (chamberRadius - size); // Ensure solid particles are within bounds
                    particle.position.set(
                        r * Math.cos(angle),
                        chamberCenterY - chamberHeight / 2 + size / 2 + Math.random() * 0.5, // Stack slightly above bottom
                        r * Math.sin(angle)
                    );
                    particle.castShadow = true;
                    particle.userData = { type: 'solid', velocity: new THREE.Vector3(0, 0, 0) }; // Solids don't move
                    particleGroup.add(particle);
                    solidParticles.push(particle);
                }
                for (let i = 0; i < aqueousCount; i++) {
                    const size = 0.2 + Math.random() * 0.1;
                    const geometry = new THREE.SphereGeometry(size, 16, 16);
                    const material = new THREE.MeshPhongMaterial({ color: aqueousColor, transparent: true, opacity: 0.8 });
                    const particle = new THREE.Mesh(geometry, material);
                    const angle = Math.random() * Math.PI * 2;
                    const r = Math.random() * chamberRadius * 0.9; // Keep slightly within liquid bounds
                    particle.position.set(
                        r * Math.cos(angle),
                        chamberCenterY - chamberHeight / 2 + size + Math.random() * (chamberHeight * 0.8), // Confine to liquid-like region
                        r * Math.sin(angle)
                    );
                    particle.castShadow = true;
                    particle.userData = {
                        type: 'aqueous',
                        velocity: new THREE.Vector3(
                            (Math.random() - 0.5) * 0.05,
                            (Math.random() - 0.5) * 0.05,
                            (Math.random() - 0.5) * 0.05
                        )
                    };
                    particleGroup.add(particle);
                    aqueousParticles.push(particle);
                }
            }

            scene.add(particleGroup);
        }
        function createReactionArrow() {
            if (arrowGroup) {
                scene.remove(arrowGroup);
                arrowGroup.children.forEach(child => child.geometry.dispose());
                arrowGroup.children.forEach(child => child.material.dispose());
            }

            arrowGroup = new THREE.Group();
            const lineGeometry = new THREE.BufferGeometry().setFromPoints([
                new THREE.Vector3(-4, 0, 0),
                new THREE.Vector3(4, 0, 0)
            ]);
            const lineMaterial = new THREE.LineBasicMaterial({ color: 0x00aa00, linewidth: 4 });
            const line = new THREE.Line(lineGeometry, lineMaterial);
            arrowGroup.add(line);
            const headGeometry = new THREE.ConeGeometry(0.5, 1.5, 16);
            const headMaterial = new THREE.MeshBasicMaterial({ color: 0x00aa00 });
            const forwardHead = new THREE.Mesh(headGeometry, headMaterial);
            forwardHead.position.set(4.5, 0, 0);
            forwardHead.rotation.z = -Math.PI / 2; // Point right
            arrowGroup.add(forwardHead);
            const reverseHead = new THREE.Mesh(headGeometry, headMaterial);
            reverseHead.position.set(-4.5, 0, 0);
            reverseHead.rotation.z = Math.PI / 2; // Point left
            reverseHead.position.y -= 0.5; // Offset slightly
            arrowGroup.add(reverseHead);
            arrowGroup.position.y = 11;
            arrowGroup.position.z = 0;

            scene.add(arrowGroup);
        }

        function createTemperatureGauge() {
            const gaugeGroup = new THREE.Group();
            gaugeGroup.name = "temperatureGauge"; // Give it a name for easier lookup
            gaugeGroup.position.set(12, 5, 0); // Position gauge to the side
            const baseGeometry = new THREE.CylinderGeometry(1.5, 1.5, 0.3, 32);
            const baseMaterial = new THREE.MeshPhongMaterial({ color: 0x333333 });
            const base = new THREE.Mesh(baseGeometry, baseMaterial);
            gaugeGroup.add(base);
            const faceGeometry = new THREE.CylinderGeometry(1.4, 1.4, 0.2, 32);
            const faceMaterial = new THREE.MeshPhongMaterial({ color: 0xffffff });
            const face = new THREE.Mesh(faceGeometry, faceMaterial);
            face.position.y = 0.15;
            gaugeGroup.add(face);
            const needleGeometry = new THREE.BoxGeometry(1.3, 0.15, 0.15); // Slightly thicker needle
            const needleMaterial = new THREE.MeshPhongMaterial({ color: 0xff0000 });
            const needle = new THREE.Mesh(needleGeometry, needleMaterial);
            needle.position.y = 0.16; // Slightly above face
            needle.rotation.z = -Math.PI / 4; // Start at 0°C position (min temp)
            needle.position.x = 0.65; // Pivot from the center
            gaugeGroup.add(needle);
            const pivot = new THREE.Object3D();
            pivot.position.set(0, 0.16, 0); // Center of the gauge face
            pivot.add(needle);
            gaugeGroup.add(pivot);
            gaugeGroup.userData = { needlePivot: pivot, needle };

            scene.add(gaugeGroup);
        }

        function updateTemperatureGauge(temp) {
            const gaugeGroup = scene.getObjectByName("temperatureGauge");
            if (gaugeGroup && gaugeGroup.userData.needlePivot) {
                const minTemp = 0;
                const maxTemp = 200;
                const minRotation = -Math.PI / 4; // Corresponds to 0 degrees on gauge
                const maxRotation = Math.PI / 4;  // Corresponds to 200 degrees on gauge
                const targetRotation = minRotation + (temp - minTemp) / (maxTemp - minTemp) * (maxRotation - minRotation);
                gaugeGroup.userData.needlePivot.rotation.z = targetRotation;
            }
        }

        function onWindowResize() {
            const container = document.getElementById('reactor-viz');
            if (!container) return;

            const width = container.clientWidth;
            const height = container.clientHeight;

            camera.aspect = width / height;
            camera.updateProjectionMatrix();
            renderer.setSize(width, height);
            if (window.innerWidth < 768) {
                camera.position.z = 40;
                camera.position.y = 15; // Move camera up a bit
            } else {
                camera.position.z = 30;
                camera.position.y = 10; // Default position
            }
            controls.update(); // Update controls after camera position change
        }

        function animate() {
            requestAnimationFrame(animate);
            controls.update();
            animateParticles();
            renderer.render(scene, camera);
        }

        function animateParticles() {
            const baseSpeedFactor = 0.005; 
            const temperatureEffect = (systemState.temperature / 100) + 0.5;
            const shiftIntensity = Math.abs(systemState.equilibriumShift / 100); // 0 to 1

            particleGroup.children.forEach(particle => {
                if (particle.userData.type === 'solid') {
                    return;
                }
                particle.userData.velocity.x += (Math.random() - 0.5) * baseSpeedFactor * temperatureEffect;
                particle.userData.velocity.y += (Math.random() - 0.5) * baseSpeedFactor * temperatureEffect;
                particle.userData.velocity.z += (Math.random() - 0.5) * baseSpeedFactor * temperatureEffect;
                if (systemState.equilibriumShift > 0) { // Shifting right
                    if (particle.userData.type === 'reactant' || particle.userData.type === 'solid') {
                        particle.userData.velocity.x += shiftIntensity * baseSpeedFactor * 5; // Move reactants right
                    } else if (particle.userData.type === 'product' || particle.userData.type === 'aqueous') {
                        particle.userData.velocity.x += (Math.random() - 0.5) * baseSpeedFactor * shiftIntensity;
                    }
                } else if (systemState.equilibriumShift < 0) { // Shifting left
                    if (particle.userData.type === 'product' || particle.userData.type === 'aqueous') {
                        particle.userData.velocity.x -= shiftIntensity * baseSpeedFactor * 5; // Move products left
                    } else if (particle.userData.type === 'reactant' || particle.userData.type === 'solid') {
                        particle.userData.velocity.x -= (Math.random() - 0.5) * baseSpeedFactor * shiftIntensity;
                    }
                }
                if (currentReactionType === 'dissolution') {
                    if (particle.userData.type === 'aqueous') {
                        if (systemState.equilibriumShift > 0) { // Shift right (more dissolution)
                            particle.userData.velocity.y += 0.005 * shiftIntensity; // Tendency to move up/disperse
                        } else if (systemState.equilibriumShift < 0) { // Shift left (more precipitation)
                            particle.userData.velocity.y -= 0.005 * shiftIntensity; // Tendency to move down
                            particle.userData.velocity.x += (Math.random() - 0.5) * 0.005 * shiftIntensity;
                            particle.userData.velocity.z += (Math.random() - 0.5) * 0.005 * shiftIntensity;
                        }
                        particle.userData.velocity.y += 0.0005;
                    }
                }
                particle.position.x += particle.userData.velocity.x;
                particle.position.y += particle.userData.velocity.y;
                particle.position.z += particle.userData.velocity.z;
                particle.userData.velocity.multiplyScalar(0.98); // Higher damping for smoother stop
                const particleSize = particle.geometry.parameters.radius || (particle.geometry.parameters.width / 2); // For spheres/boxes
                const effectiveChamberRadius = chamberRadius - particleSize;
                const effectiveMaxY = chamberCenterY + chamberHeight / 2 - particleSize;
                const effectiveMinY = chamberCenterY - chamberHeight / 2 + particleSize;
                const horizontalDist = Math.sqrt(particle.position.x * particle.position.x +
                    particle.position.z * particle.position.z);
                if (horizontalDist > effectiveChamberRadius) {
                    const correction = effectiveChamberRadius / horizontalDist;
                    particle.position.x *= correction;
                    particle.position.z *= correction;
                    const normal = new THREE.Vector3(particle.position.x, 0, particle.position.z).normalize();
                    particle.userData.velocity.reflect(normal);
                    particle.userData.velocity.multiplyScalar(0.7); // Stronger bounce damping
                }
                if (particle.position.y > effectiveMaxY) {
                    particle.position.y = effectiveMaxY;
                    particle.userData.velocity.y *= -0.7; // Bounce off top
                } else if (particle.position.y < effectiveMinY) {
                    particle.position.y = effectiveMinY;
                    particle.userData.velocity.y *= -0.7; // Bounce off bottom
                }
            });
        }

        function setupEventListeners() {
            document.getElementById('reactionType').addEventListener('change', function() {
                currentReactionType = this.value;
                updateReactionEquation();
                resetToEquilibrium(false); // Reset to equilibrium for new reaction type, but don't force all sliders to default
                updateSystem(); // Recalculate equilibrium and re-render particles
            });
            document.getElementById('temperature').addEventListener('input', function() {
                document.getElementById('tempValue').textContent = this.value + '°C';
                systemState.temperature = parseFloat(this.value);
                updateTemperatureGauge(systemState.temperature);
                updateSystem();
            });

            document.getElementById('pressure').addEventListener('input', function() {
                document.getElementById('pressureValue').textContent = this.value + ' atm';
                systemState.pressure = parseFloat(this.value);
                updateSystem();
            });

            document.getElementById('reactantConcentration').addEventListener('input', function() {
                let newReactantConc = parseFloat(this.value);
                let currentProductConc = systemState.productConc;
                if (newReactantConc + currentProductConc > 100) {
                    currentProductConc = 100 - newReactantConc;
                    document.getElementById('productConcentration').value = currentProductConc;
                    document.getElementById('productValue').textContent = currentProductConc.toFixed(0) + '%';
                    systemState.productConc = currentProductConc;
                }

                document.getElementById('reactantValue').textContent = newReactantConc.toFixed(0) + '%';
                systemState.reactantConc = newReactantConc;
                updateSystem();
            });

            document.getElementById('productConcentration').addEventListener('input', function() {
                let newProductConc = parseFloat(this.value);
                let currentReactantConc = systemState.reactantConc;
                if (currentReactantConc + newProductConc > 100) {
                    currentReactantConc = 100 - newProductConc;
                    document.getElementById('reactantConcentration').value = currentReactantConc;
                    document.getElementById('reactantValue').textContent = currentReactantConc.toFixed(0) + '%';
                    systemState.reactantConc = currentReactantConc;
                }

                document.getElementById('productValue').textContent = newProductConc.toFixed(0) + '%';
                systemState.productConc = newProductConc;
                updateSystem();
            });
            document.getElementById('resetBtn').addEventListener('click', function() {
                resetToEquilibrium(true); // Reset all sliders to default initial values
                speak("System has been reset to equilibrium. Please make new adjustments.", 500);
            });

            document.getElementById('recordBtn').addEventListener('click', function() {
                recordObservation();
            });

            document.getElementById('clearBtn').addEventListener('click', function() {
                clearObservations();
                speak("Observation log has been cleared.", 500);
            });
        }

        function updateReactionEquation() {
            const equationElement = document.getElementById('reactionEquation');
            const reactantConcSlider = document.getElementById('reactantConcentration');
            const productConcSlider = document.getElementById('productConcentration');
            const pressureSliderDiv = document.getElementById('pressure').parentElement;

            let defaultReactantConc = 50;
            let defaultProductConc = 50;

            switch (currentReactionType) {
                case 'exothermic':
                    equationElement.innerHTML = 'A(aq) + B(aq) &harr; C(aq) + <b>Heat</b>';
                    pressureSliderDiv.style.display = 'block';
                    reactantConcSlider.parentElement.style.display = 'block';
                    productConcSlider.parentElement.style.display = 'block';
                    break;
                case 'endothermic':
                    equationElement.innerHTML = 'A(aq) + B(aq) + <b>Heat</b> &harr; C(aq)';
                    pressureSliderDiv.style.display = 'block';
                    reactantConcSlider.parentElement.style.display = 'block';
                    productConcSlider.parentElement.style.display = 'block';
                    break;
                case 'gas':
                    equationElement.innerHTML = '2A(g) &harr; B(g)';
                    pressureSliderDiv.style.display = 'block';
                    reactantConcSlider.parentElement.style.display = 'block';
                    productConcSlider.parentElement.style.display = 'block';
                    break;
                case 'dissolution':
                    equationElement.innerHTML = 'Solid &harr; Aqueous Ions';
                    defaultReactantConc = 70; // Represents undissolved solid
                    defaultProductConc = 30; // Represents dissolved ions
                    pressureSliderDiv.style.display = 'block';
                    reactantConcSlider.parentElement.style.display = 'block';
                    productConcSlider.parentElement.style.display = 'block';
                    break;
            }
            reactantConcSlider.value = defaultReactantConc;
            productConcSlider.value = defaultProductConc;
            document.getElementById('reactantValue').textContent = defaultReactantConc + '%';
            document.getElementById('productValue').textContent = defaultProductConc + '%';
            systemState.reactantConc = defaultReactantConc;
            systemState.productConc = defaultProductConc;
            createParticles(); // Recreate particles based on new reaction type and concentrations
        }

        function updateSystem() {
            let shiftValue = 0; // -100 (left) to 100 (right)
            let explanationText = "The net rate of forward and reverse reactions are equal. No net shift occurring.";
            let statusText = "System at Equilibrium";
            let statusLightClass = "equilibrium"; // Green by default
            let factorsText = "None"; // Factors influencing shift

            const initialReactantConc = (currentReactionType === 'dissolution') ? 70 : 50;
            const initialProductConc = (currentReactionType === 'dissolution') ? 30 : 50;
            const initialTemp = 25;
            const initialPressure = 1;

            let factors = [];
            switch (currentReactionType) {
                case 'exothermic':
                    if (systemState.temperature > initialTemp) {
                        shiftValue -= (systemState.temperature - initialTemp) * 0.5; // Shift left
                        factors.push(`Increased Temperature: System consumes excess heat.`);
                    } else if (systemState.temperature < initialTemp) {
                        shiftValue += (initialTemp - systemState.temperature) * 0.5; // Shift right
                        factors.push(`Decreased Temperature: System produces heat.`);
                    }
                    if (systemState.reactantConc > initialReactantConc) {
                        shiftValue += (systemState.reactantConc - initialReactantConc) * 0.5;
                        factors.push(`Increased Reactant Conc.: System consumes reactants.`);
                    } else if (systemState.productConc > initialProductConc) {
                        shiftValue -= (systemState.productConc - initialProductConc) * 0.5;
                        factors.push(`Increased Product Conc.: System consumes products.`);
                    }
                    break;

                case 'endothermic':
                    if (systemState.temperature > initialTemp) {
                        shiftValue += (systemState.temperature - initialTemp) * 0.5; // Shift right
                        factors.push(`Increased Temperature: System consumes heat.`);
                    } else if (systemState.temperature < initialTemp) {
                        shiftValue -= (initialTemp - systemState.temperature) * 0.5; // Shift left
                        factors.push(`Decreased Temperature: System produces heat.`);
                    }
                    // Concentration effect (same as exothermic)
                    if (systemState.reactantConc > initialReactantConc) {
                        shiftValue += (systemState.reactantConc - initialReactantConc) * 0.5;
                        factors.push(`Increased Reactant Conc.: System consumes reactants.`);
                    } else if (systemState.productConc > initialProductConc) {
                        shiftValue -= (systemState.productConc - initialProductConc) * 0.5;
                        factors.push(`Increased Product Conc.: System consumes products.`);
                    }
                    // Pressure has no direct effect on aqueous reactions
                    break;

                case 'gas':
                    if (systemState.pressure > initialPressure) {
                        shiftValue += (systemState.pressure - initialPressure) * 10; // Shift right (towards B)
                        factors.push(`Increased Pressure: System reduces total moles.`);
                    } else if (systemState.pressure < initialPressure) {
                        shiftValue -= (initialPressure - systemState.pressure) * 10; // Shift left (towards 2A)
                        factors.push(`Decreased Pressure: System increases total moles.`);
                    }
                   
                    if (systemState.temperature > initialTemp) {
                        shiftValue -= (systemState.temperature - initialTemp) * 0.5; // Shift left
                        factors.push(`Increased Temperature: System consumes excess heat.`);
                    } else if (systemState.temperature < initialTemp) {
                        shiftValue += (initialTemp - systemState.temperature) * 0.5; // Shift right
                        factors.push(`Decreased Temperature: System produces heat.`);
                    }

                    if (systemState.reactantConc > initialReactantConc) {
                        shiftValue += (systemState.reactantConc - initialReactantConc) * 0.5;
                        factors.push(`Increased Reactant Conc.: System consumes reactants.`);
                    } else if (systemState.productConc > initialProductConc) {
                        shiftValue -= (systemState.productConc - initialProductConc) * 0.5;
                        factors.push(`Increased Product Conc.: System consumes products.`);
                    }
                    break;

                case 'dissolution': 
                    if (systemState.temperature > initialTemp) {
                        shiftValue += (systemState.temperature - initialTemp) * 0.5;
                        factors.push(`Increased Temperature: System favors dissolution.`);
                    } else if (systemState.temperature < initialTemp) {
                        shiftValue -= (initialTemp - systemState.temperature) * 0.5;
                        factors.push(`Decreased Temperature: System favors precipitation.`);
                    }
                    if (systemState.productConc > initialProductConc) { // More aqueous ions
                        shiftValue -= (systemState.productConc - initialProductConc) * 0.5; // Shifts left (more solid)
                        factors.push(`Increased Aqueous Ions: System favors precipitation.`);
                    } else if (systemState.reactantConc > initialReactantConc) { // More solid present
                        
                        shiftValue -= (systemState.reactantConc - initialReactantConc) * 0.5; // High solid means system has excess reactant, push left
                        factors.push(`Increased Solid Amount: System has excess solid.`);

                    } else if (systemState.productConc < initialProductConc) { // Less aqueous ions
                        shiftValue += (initialProductConc - systemState.productConc) * 0.5; // Shifts right (more dissolution)
                        factors.push(`Decreased Aqueous Ions: System favors dissolution.`);
                    }
                    break;
            }
            shiftValue = Math.max(-100, Math.min(100, shiftValue));
            systemState.equilibriumShift = shiftValue;
            const shiftThreshold = 5; // Small threshold for "at equilibrium"
            const strongShiftThreshold = 50; // Threshold for "strong shift"

            if (Math.abs(shiftValue) < shiftThreshold) {
                systemState.equilibriumStatus = 'balanced';
                statusText = "System at Equilibrium";
                explanationText = "The net rate of forward and reverse reactions are equal. No net shift occurring.";
                statusLightClass = "equilibrium";
            } else if (shiftValue > 0) {
                systemState.equilibriumStatus = 'shifting-right';
                statusText = "Shifting to the Right";
                explanationText = "The system is trying to relieve the stress by favoring the formation of products.";
                statusLightClass = (shiftValue > strongShiftThreshold) ? "strong-shift" : "shifting";
            } else { // shiftValue < 0
                systemState.equilibriumStatus = 'shifting-left';
                statusText = "Shifting to the Left";
                explanationText = "The system is trying to relieve the stress by favoring the formation of reactants.";
                statusLightClass = (shiftValue < -strongShiftThreshold) ? "strong-shift" : "shifting";
            }

            document.getElementById('statusText').textContent = statusText;
            document.getElementById('equilibriumExplanation').textContent = explanationText;
            document.getElementById('shiftAmount').textContent = shiftValue.toFixed(0); // Display quantified shift
            const statusLight = document.getElementById('statusLight');
            statusLight.className = 'status-light ' + statusLightClass;

            const shiftBar = document.getElementById('shiftBar');
            const absShift = Math.abs(shiftValue);
            shiftBar.style.width = `${50 + shiftValue / 2}%`; // 0% shift -> 50% width; 100% shift -> 100% or 0%
            shiftBar.classList.remove('left', 'right'); // Clear previous classes
            if (shiftValue < -shiftThreshold) {
                shiftBar.classList.add('left');
                shiftBar.style.width = `${50 + shiftValue / 2}%`; // Shrinks from right for left shift
            } else if (shiftValue > shiftThreshold) {
                shiftBar.classList.add('right');
                shiftBar.style.width = `${50 + shiftValue / 2}%`; // Grows from left for right shift
            } else {
                 shiftBar.style.width = `50%`; // Centered
                 shiftBar.style.backgroundColor = '#3498db'; // Default blue for no shift
            }
            document.getElementById('factorsInfluencingShift').innerHTML =
                `<strong>Factors Influencing Shift:</strong> ${factors.length > 0 ? factors.join('<br>') : 'None'}`;
            createParticles();
        }

        function resetToEquilibrium(resetAllSliders = true) {
            document.getElementById('temperature').value = 25;
            document.getElementById('tempValue').textContent = '25°C';
            systemState.temperature = 25;
            updateTemperatureGauge(25);

            document.getElementById('pressure').value = 1;
            document.getElementById('pressureValue').textContent = '1 atm';
            systemState.pressure = 1;

            if (resetAllSliders) { // Only reset concentrations if explicitly requested (e.g., by reset button)
                const initialReactantConc = (currentReactionType === 'dissolution') ? 70 : 50;
                const initialProductConc = (currentReactionType === 'dissolution') ? 30 : 50;

                document.getElementById('reactantConcentration').value = initialReactantConc;
                document.getElementById('reactantValue').textContent = initialReactantConc + '%';
                systemState.reactantConc = initialReactantConc;
                document.getElementById('productConcentration').value = initialProductConc;
                document.getElementById('productValue').textContent = initialProductConc + '%';
                systemState.productConc = initialProductConc;
            }

            // Recalculate system state
            updateSystem();
        }

        let observationCounter = 0;
        function recordObservation() {
            observationCounter++;
            const tableBody = document.getElementById('observationTableBody');

            if (observations.length >= MAX_OBSERVATIONS) {
                observations.shift(); // Remove from array
                tableBody.removeChild(tableBody.firstElementChild); // Remove from DOM
            }
            const newObservation = {
                id: observationCounter,
                temperature: systemState.temperature,
                pressure: systemState.pressure,
                reactantConc: systemState.reactantConc,
                productConc: systemState.productConc,
                shift: document.getElementById('statusText').textContent // Use the current status text
            };
            observations.push(newObservation);

            const row = tableBody.insertRow();
            row.insertCell().textContent = newObservation.id;
            row.insertCell().textContent = newObservation.temperature;
            row.insertCell().textContent = newObservation.pressure;
            row.insertCell().textContent = newObservation.reactantConc;
            row.insertCell().textContent = newObservation.productConc;
            row.insertCell().textContent = newObservation.shift;
            const statusSpeech = document.getElementById('statusText').textContent;
            let observationSpeech = `Observation recorded. System status: ${statusSpeech}. `;
            observationSpeech += `Temperature: ${newObservation.temperature} degrees Celsius, `;
            observationSpeech += `Pressure: ${newObservation.pressure} atmospheres, `;
            observationSpeech += `Reactants: ${newObservation.reactantConc} percent, `;
            observationSpeech += `Products: ${newObservation.productConc} percent.`;
            speak(observationSpeech, 500); 
        }

        function clearObservations() {
            observations = [];
            observationCounter = 0;
            document.getElementById('observationTableBody').innerHTML = ''; 
        }
        document.addEventListener('DOMContentLoaded', init);
