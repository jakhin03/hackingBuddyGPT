/* Graph View for hackingBuddyGPT using D3.js */

class GraphView {
    constructor() {
        this.svg = null;
        this.simulation = null;
        this.nodes = [];
        this.links = [];
        this.width = 0;
        this.height = 0;
        this.selectedNode = null;
        this.isGraphView = false;
        
        this.initializeGraph();
        this.setupEventListeners();
    }

    initializeGraph() {
        const container = d3.select("#graph-svg");
        this.width = container.node().clientWidth;
        this.height = container.node().clientHeight;
        
        this.svg = container.append("svg")
            .attr("width", this.width)
            .attr("height", this.height);

        // Add zoom behavior
        const zoom = d3.zoom()
            .scaleExtent([0.1, 4])
            .on("zoom", (event) => {
                this.svg.select(".graph-container")
                    .attr("transform", event.transform);
            });

        this.svg.call(zoom);

        // Create graph container
        const graphContainer = this.svg.append("g")
            .attr("class", "graph-container");

        // Add arrow markers for links with better styling
        const defs = this.svg.append("defs");
        
        // Arrow for regular links
        defs.append("marker")
            .attr("id", "arrowhead")
            .attr("viewBox", "0 -5 10 10")
            .attr("refX", 25)
            .attr("refY", 0)
            .attr("markerWidth", 8)
            .attr("markerHeight", 8)
            .attr("orient", "auto")
            .append("path")
            .attr("d", "M0,-5L10,0L0,5")
            .attr("fill", "var(--md-sys-color-outline)");
            
        // Arrow for tool calls
        defs.append("marker")
            .attr("id", "arrowhead-tool")
            .attr("viewBox", "0 -5 10 10")
            .attr("refX", 25)
            .attr("refY", 0)
            .attr("markerWidth", 8)
            .attr("markerHeight", 8)
            .attr("orient", "auto")
            .append("path")
            .attr("d", "M0,-5L10,0L0,5")
            .attr("fill", "var(--md-sys-color-error)");

        // Create force simulation with improved forces
        this.simulation = d3.forceSimulation()
            .force("link", d3.forceLink().id(d => d.id).distance(120).strength(0.8))
            .force("charge", d3.forceManyBody().strength(-400).distanceMax(300))
            .force("center", d3.forceCenter(this.width / 2, this.height / 2))
            .force("collision", d3.forceCollide().radius(35).strength(0.7))
            .force("x", d3.forceX(this.width / 2).strength(0.1))
            .force("y", d3.forceY(this.height / 2).strength(0.1));

        this.addGraphControls();
    }

    addGraphControls() {
        // Check if controls already exist
        const existingControls = document.querySelector('.graph-controls');
        if (existingControls) {
            existingControls.remove();
        }

        const graphViewContainer = document.getElementById('graph-view');
        if (!graphViewContainer) {
            console.error('Graph view container not found');
            return;
        }

        const controlsContainer = document.createElement('div');
        controlsContainer.className = 'graph-controls';
        controlsContainer.style.cssText = `
            position: absolute;
            top: 16px;
            right: 16px;
            z-index: 1000;
            display: flex;
            gap: 8px;
        `;

        // Create buttons with Material Icons as text content
        const buttons = [
            {
                class: 'zoom-in-btn',
                icon: 'zoom_in',
                tooltip: 'Zoom In',
                action: () => this.zoomIn()
            },
            {
                class: 'zoom-out-btn', 
                icon: 'zoom_out',
                tooltip: 'Zoom Out',
                action: () => this.zoomOut()
            },
            {
                class: 'reset-zoom-btn',
                icon: 'center_focus_strong',
                tooltip: 'Reset Zoom',
                action: () => this.resetZoom()
            }
        ];

        buttons.forEach(buttonConfig => {
            const button = document.createElement('button');
            button.className = `graph-control-btn ${buttonConfig.class}`;
            button.style.cssText = `
                background: var(--md-sys-color-primary-container);
                color: var(--md-sys-color-on-primary-container);
                border: none;
                border-radius: 50%;
                width: 48px;
                height: 48px;
                cursor: pointer;
                display: flex;
                align-items: center;
                justify-content: center;
                box-shadow: var(--md-sys-elevation-level2);
                font-family: 'Material Icons';
                font-size: 24px;
                transition: all 0.2s ease;
            `;
            button.innerHTML = buttonConfig.icon;
            button.title = buttonConfig.tooltip;
            button.addEventListener('click', buttonConfig.action);
            
            // Add hover effects
            button.addEventListener('mouseenter', () => {
                button.style.transform = 'scale(1.05)';
                button.style.boxShadow = 'var(--md-sys-elevation-level3)';
            });
            
            button.addEventListener('mouseleave', () => {
                button.style.transform = 'scale(1)';
                button.style.boxShadow = 'var(--md-sys-elevation-level2)';
            });

            controlsContainer.appendChild(button);
        });

        graphViewContainer.appendChild(controlsContainer);
        console.log('Graph controls added successfully');
    }

    zoomIn() {
        if (!this.svg) return;
        console.log('Zooming in...');
        
        const currentTransform = d3.zoomTransform(this.svg.node());
        const newScale = Math.min(currentTransform.k * 1.5, 4); // Max zoom = 4x
        
        this.svg.transition()
            .duration(300)
            .call(
                d3.zoom().transform,
                d3.zoomIdentity.translate(currentTransform.x, currentTransform.y).scale(newScale)
            );
    }

    zoomOut() {
        if (!this.svg) return;
        console.log('Zooming out...');
        
        const currentTransform = d3.zoomTransform(this.svg.node());
        const newScale = Math.max(currentTransform.k / 1.5, 0.1); // Min zoom = 0.1x
        
        this.svg.transition()
            .duration(300)
            .call(
                d3.zoom().transform,
                d3.zoomIdentity.translate(currentTransform.x, currentTransform.y).scale(newScale)
            );
    }

    resetZoom() {
        if (!this.svg) return;
        console.log('Resetting zoom...');
        
        this.svg.transition()
            .duration(500)
            .call(
                d3.zoom().transform,
                d3.zoomIdentity
            );
    }

    setupEventListeners() {
        // Toggle view button
        const toggleBtn = document.getElementById('view-toggle');
        if (toggleBtn) {
            toggleBtn.addEventListener('click', () => this.toggleView());
        }

        // Window resize handler
        window.addEventListener('resize', () => this.handleResize());

        // Clear graph button
        const clearBtn = document.getElementById('clear-graph');
        if (clearBtn) {
            clearBtn.addEventListener('click', () => this.clearGraph());
        }
        
        // Test graph button
        const testBtn = document.getElementById('test-graph');
        if (testBtn) {
            testBtn.addEventListener('click', () => {
                console.log('Test button clicked');
                this.loadTestData();
                // Switch to graph view if not already
                if (!this.isGraphView) {
                    this.toggleView();
                }
            });
        }
        
        // Auto-load first run if available
        setTimeout(() => {
            const firstRunLink = document.querySelector('.run-list-entry a');
            if (firstRunLink && this.nodes.length === 0) {
                console.log('Auto-clicking first run for graph data');
                firstRunLink.click();
            }
        }, 2000);

        // Handle escape key to deselect nodes
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.selectNode(null);
            }
        });
    }

    toggleView() {
        this.isGraphView = !this.isGraphView;
        
        const listContainer = document.getElementById('list-view');
        const graphContainer = document.getElementById('graph-view');
        const toggleBtn = document.getElementById('view-toggle');
        
        if (this.isGraphView) {
            listContainer.style.display = 'none';
            graphContainer.style.display = 'flex';
            if (toggleBtn) {
                const icon = toggleBtn.querySelector('.material-icons');
                if (icon) icon.textContent = 'list';
                toggleBtn.setAttribute('data-tooltip', 'Switch to List View');
                toggleBtn.setAttribute('aria-label', 'Toggle List View');
            }
            // Ensure container exists and resize
            setTimeout(() => {
                this.handleResize();
                this.updateGraph();
                console.log('Switched to graph view, nodes:', this.nodes.length, 'links:', this.links.length);
            }, 100);
        } else {
            listContainer.style.display = 'flex';
            graphContainer.style.display = 'none';
            if (toggleBtn) {
                const icon = toggleBtn.querySelector('.material-icons');
                if (icon) icon.textContent = 'account_tree';
                toggleBtn.setAttribute('data-tooltip', 'Switch to Graph View');
                toggleBtn.setAttribute('aria-label', 'Toggle Graph View');
            }
        }
    }

    handleResize() {
        if (!this.isGraphView) return;
        
        const container = d3.select("#graph-svg");
        const newWidth = container.node().clientWidth;
        const newHeight = container.node().clientHeight;
        
        this.width = newWidth;
        this.height = newHeight;
        
        this.svg.attr("width", newWidth).attr("height", newHeight);
        
        this.simulation
            .force("center", d3.forceCenter(newWidth / 2, newHeight / 2))
            .force("x", d3.forceX(newWidth / 2).strength(0.1))
            .force("y", d3.forceY(newHeight / 2).strength(0.1))
            .alpha(0.3)
            .restart();
    }

    addMessage(message) {
        // Create a unique ID for the message
        const messageId = `msg_${message.id}_${message.run_id || 'unknown'}`;
        
        // Check if node already exists
        const existingIndex = this.nodes.findIndex(n => n.id === messageId);
        if (existingIndex !== -1) {
            console.log('Message already exists:', messageId);
            return messageId;
        }
        
        const node = {
            id: messageId,
            type: 'message',
            role: message.role || 'user',
            content: message.content || '',
            timestamp: message.timestamp || new Date().toISOString(),
            run_id: message.run_id,
            section_id: message.section_id,
            originalId: message.id
        };
        
        this.nodes.push(node);
        console.log('Added message node:', messageId, node.role);
        
        // Create link to previous message in same run/section
        const prevMessages = this.nodes.filter(n => 
            n.type === 'message' && 
            n.run_id === message.run_id && 
            n.section_id === message.section_id &&
            n.id !== messageId
        ).sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
        
        if (prevMessages.length > 0) {
            const prevMessage = prevMessages[prevMessages.length - 1];
            const linkId = `${prevMessage.id}-${messageId}`;
            
            // Check if link already exists
            const existingLink = this.links.find(l => 
                `${l.source.id || l.source}-${l.target.id || l.target}` === linkId
            );
            
            if (!existingLink) {
                this.links.push({
                    source: prevMessage.id,
                    target: messageId,
                    type: 'message_flow'
                });
                console.log('Added message flow link:', prevMessage.id, '->', messageId);
            }
        }
        
        if (this.isGraphView) {
            this.updateGraph();
        }
        
        return messageId;
    }

    addToolCall(toolCall) {
        // Create a unique ID for the tool call
        const toolCallId = `tool_${toolCall.id}_${toolCall.message_id || 'unknown'}`;
        
        // Check if node already exists
        const existingIndex = this.nodes.findIndex(n => n.id === toolCallId);
        if (existingIndex !== -1) {
            console.log('Tool call already exists:', toolCallId);
            return toolCallId;
        }
        
        const node = {
            id: toolCallId,
            type: 'tool_call',
            tool_name: toolCall.tool_name || toolCall.function_name || '',
            status: toolCall.status || toolCall.state || 'pending',
            result: toolCall.result || toolCall.result_text || '',
            timestamp: toolCall.timestamp || new Date().toISOString(),
            message_id: toolCall.message_id,
            originalId: toolCall.id
        };
        
        this.nodes.push(node);
        console.log('Added tool call node:', toolCallId, node.tool_name);
        
        // Create link from message to tool call
        if (toolCall.message_id) {
            const messageNode = this.nodes.find(n => 
                n.type === 'message' && 
                n.originalId == toolCall.message_id
            );
            
            if (messageNode) {
                const linkId = `${messageNode.id}-${toolCallId}`;
                
                // Check if link already exists
                const existingLink = this.links.find(l => 
                    `${l.source.id || l.source}-${l.target.id || l.target}` === linkId
                );
                
                if (!existingLink) {
                    this.links.push({
                        source: messageNode.id,
                        target: toolCallId,
                        type: 'tool_call'
                    });
                    console.log('Added tool call link:', messageNode.id, '->', toolCallId);
                }
            } else {
                console.warn('Parent message not found for tool call:', toolCall.message_id);
            }
        }
        
        if (this.isGraphView) {
            this.updateGraph();
        }
        
        return toolCallId;
    }

    clearGraph() {
        this.nodes = [];
        this.links = [];
        this.selectedNode = null;
        this.hideNodeDetails();
        this.updateGraph();
    }

    updateGraph() {
        if (!this.svg || !this.isGraphView) return;

        const graphContainer = this.svg.select(".graph-container");

        // Update links with enhanced styling
        const link = graphContainer.selectAll(".graph-link")
            .data(this.links, d => `${d.source.id || d.source}-${d.target.id || d.target}`);

        link.exit().remove();

        const linkEnter = link.enter().append("line")
            .attr("class", d => `graph-link ${d.type}`)
            .attr("stroke", d => this.getLinkColor(d.type))
            .attr("stroke-width", d => this.getLinkWidth(d.type))
            .attr("stroke-dasharray", d => d.type === 'tool_call' ? "6,4" : "none")
            .attr("marker-end", d => d.type === 'tool_call' ? 
                "url(#arrowhead-tool)" : 
                "url(#arrowhead)")
            .attr("opacity", 0.8);

        const linkUpdate = linkEnter.merge(link);

        // Update nodes with enhanced Material You design
        const node = graphContainer.selectAll(".graph-node")
            .data(this.nodes, d => d.id);

        node.exit().remove();

        const nodeEnter = node.enter().append("g")
            .attr("class", d => `graph-node node-${d.type === 'message' ? d.role : 'tool'}${d.status === 'error' ? ' status-error' : ''}`)
            .call(this.drag());

        // Add enhanced circles with rounded rectangles for better Material You feel
        nodeEnter.append("circle")
            .attr("r", d => this.getNodeRadius(d))
            .attr("fill", d => this.getNodeFillColor(d))
            .attr("stroke", d => this.getNodeStrokeColor(d))
            .attr("stroke-width", 2);
        
            
        // Add icons for better visual distinction
        nodeEnter.append("text")
            .attr("class", "node-icon")
            .attr("dy", "-0.2em")
            .attr("text-anchor", "middle")
            .attr("font-family", "Material Icons")
            .attr("font-size", d => this.getNodeRadius(d) * 0.6)
            .attr("fill", d => this.getNodeIconColor(d))
            .text(d => this.getNodeIcon(d));

        // Add labels below nodes
        nodeEnter.append("text")
            .attr("class", "node-label")
            .attr("dy", "2.5em")
            .attr("text-anchor", "middle")
            .attr("fill", "var(--md-sys-color-on-surface)")
            .attr("font-size", "10px")
            .attr("font-weight", "500")
            .text(d => this.getNodeLabel(d));

        const nodeUpdate = nodeEnter.merge(node);

        // Enhanced click handler with animations
        nodeUpdate.on("click", (event, d) => {
            event.stopPropagation();
            this.selectNode(d);
            this.highlightConnections(d);
        });

        // Add hover effects
        nodeUpdate.on("mouseenter", (event, d) => {
            d3.select(event.currentTarget).select("circle")
                .transition()
                .duration(200)
                .attr("transform", "scale(1.1)");
        });

        nodeUpdate.on("mouseleave", (event, d) => {
            if (d !== this.selectedNode) {
                d3.select(event.currentTarget).select("circle")
                    .transition()
                    .duration(200)
                    .attr("transform", "scale(1)");
            }
        });

        // Update simulation
        this.simulation.nodes(this.nodes);
        this.simulation.force("link").links(this.links);
        this.simulation.alpha(0.3).restart();

        // Update positions on tick with smooth animations
        this.simulation.on("tick", () => {
            linkUpdate
                .attr("x1", d => d.source.x)
                .attr("y1", d => d.source.y)
                .attr("x2", d => d.target.x)
                .attr("y2", d => d.target.y);

            nodeUpdate
                .attr("transform", d => `translate(${d.x},${d.y})`);
        });
    }

    getNodeRadius(node) {
        switch(node.type) {
            case 'message':
                return node.role === 'user' ? 28 : 32;
            case 'tool_call':
                return 25;
            default:
                return 22;
        }
    }

    getNodeLabel(node) {
        switch(node.type) {
            case 'message':
                if (node.role === 'user') return 'User';
                if (node.role === 'assistant') return 'Assistant';
                return node.role.substring(0, 8).toUpperCase();
            case 'tool_call':
                if (node.tool_name) {
                    return node.tool_name.substring(0, 10);
                }
                return 'Tool Call';
            default:
                return 'Unknown';
        }
    }

    getNodeIcon(node) {
        switch(node.type) {
            case 'message':
                return node.role === 'user' ? 'person' : 'Agent';
            case 'tool_call':
                return 'build';
            default:
                return 'help';
        }
    }

    getNodeFillColor(node) {
        switch(node.type) {
            case 'message':
                return node.role === 'user' ? 
                    'var(--md-sys-color-primary-container)' : 
                    'var(--md-sys-color-secondary-container)';
            case 'tool_call':
                if (node.status === 'error') return 'var(--md-sys-color-error-container)';
                return 'var(--md-sys-color-tertiary-container)';
            default:
                return 'var(--md-sys-color-surface-variant)';
        }
    }

    getNodeStrokeColor(node) {
        switch(node.type) {
            case 'message':
                return node.role === 'user' ? 
                    'var(--md-sys-color-primary)' : 
                    'var(--md-sys-color-secondary)';
            case 'tool_call':
                if (node.status === 'error') return 'var(--md-sys-color-error)';
                return 'var(--md-sys-color-tertiary)';
            default:
                return 'var(--md-sys-color-outline)';
        }
    }

    getNodeIconColor(node) {
        switch(node.type) {
            case 'message':
                return node.role === 'user' ? 
                    'var(--md-sys-color-on-primary-container)' : 
                    'var(--md-sys-color-on-secondary-container)';
            case 'tool_call':
                if (node.status === 'error') return 'var(--md-sys-color-on-error-container)';
                return 'var(--md-sys-color-on-tertiary-container)';
            default:
                return 'var(--md-sys-color-on-surface-variant)';
        }
    }

    getLinkColor(type) {
        switch(type) {
            case 'tool_call':
                return 'var(--md-sys-color-tertiary)';
            case 'message_flow':
                return 'var(--md-sys-color-outline)';
            default:
                return 'var(--md-sys-color-outline-variant)';
        }
    }

    getLinkWidth(type) {
        switch(type) {
            case 'tool_call':
                return 3;
            case 'message_flow':
                return 2;
            default:
                return 1;
        }
    }

    highlightConnections(node) {
        // Highlight all links connected to the selected node
        this.svg.selectAll('.graph-link')
            .classed('highlighted', d => 
                (d.source.id === node.id || d.target.id === node.id) ||
                (d.source === node.id || d.target === node.id)
            );
    }

    drag() {
        return d3.drag()
            .on("start", (event, d) => {
                if (!event.active) this.simulation.alphaTarget(0.3).restart();
                d.fx = d.x;
                d.fy = d.y;
            })
            .on("drag", (event, d) => {
                d.fx = event.x;
                d.fy = event.y;
            })
            .on("end", (event, d) => {
                if (!event.active) this.simulation.alphaTarget(0);
                d.fx = null;
                d.fy = null;
            });
    }

    selectNode(node) {
        // Update selected node
        this.selectedNode = node;
        
        // Update visual selection
        this.svg.selectAll(".node circle")
            .attr("stroke-width", d => d === node ? 4 : 2)
            .attr("stroke", d => d === node ? 
                "var(--md-sys-color-primary)" : 
                "var(--md-sys-color-outline)");
        
        if (node) {
            this.showNodeDetails(node);
        } else {
            this.hideNodeDetails();
        }
    }

    showNodeDetails(node) {
        const detailsPanel = document.getElementById('node-details');
        if (!detailsPanel) return;

        // Populate details based on node type
        let detailsHTML = '';
        
        if (node.type === 'message') {
            detailsHTML = `
                <div class="detail-header">
                    <span class="material-icons">${node.role === 'user' ? 'person' : 'Agent'}</span>
                    <h3>${node.role === 'user' ? 'User Message' : 'Assistant Message'}</h3>
                </div>
                <div class="detail-content">
                    <div class="detail-field">
                        <label>Content:</label>
                        <div class="detail-text">${node.content || 'No content'}</div>
                    </div>
                    <div class="detail-field">
                        <label>Timestamp:</label>
                        <div class="detail-text">${new Date(node.timestamp).toLocaleString()}</div>
                    </div>
                    <div class="detail-field">
                        <label>Run ID:</label>
                        <div class="detail-text">${node.run_id || 'Unknown'}</div>
                    </div>
                </div>
            `;
        } else if (node.type === 'tool_call') {
            detailsHTML = `
                <div class="detail-header">
                    <span class="material-icons">build</span>
                    <h3>Tool Call</h3>
                </div>
                <div class="detail-content">
                    <div class="detail-field">
                        <label>Tool Name:</label>
                        <div class="detail-text">${node.tool_name || 'Unknown'}</div>
                    </div>
                    <div class="detail-field">
                        <label>Status:</label>
                        <div class="detail-text status-${node.status}">${node.status || 'Unknown'}</div>
                    </div>
                    <div class="detail-field">
                        <label>Result:</label>
                        <div class="detail-text">${node.result || 'No result'}</div>
                    </div>
                    <div class="detail-field">
                        <label>Timestamp:</label>
                        <div class="detail-text">${new Date(node.timestamp).toLocaleString()}</div>
                    </div>
                </div>
            `;
        }

        detailsPanel.innerHTML = detailsHTML;
        detailsPanel.style.display = 'block';
    }

    hideNodeDetails() {
        const detailsPanel = document.getElementById('node-details');
        if (detailsPanel) {
            detailsPanel.style.display = 'none';
        }
    }

    // Add method to load data from database for debugging
    loadTestData() {
        console.log('Loading test data to graph...');
        
        // Try to load real data from API first
        fetch('/api/test-data')
            .then(response => response.json())
            .then(data => {
                if (data.error) {
                    console.warn('API error, falling back to mock data:', data.error);
                    this.loadMockData();
                    return;
                }
                
                console.log('Loading real data from API:', data);
                
                // Clear existing data
                this.clearGraph();
                
                // Add real messages
                data.messages.forEach(message => {
                    this.addMessage(message);
                });
                
                // Add real tool calls
                data.tool_calls.forEach(toolCall => {
                    this.addToolCall(toolCall);
                });
                
                console.log('Real data loaded:', {
                    nodes: this.nodes.length,
                    links: this.links.length
                });
            })
            .catch(error => {
                console.error('Failed to load real data, using mock data:', error);
                this.loadMockData();
            });
    }
    
    loadMockData() {
        console.log('Loading mock test data...');
        
        // Clear existing data
        this.clearGraph();
        
        // Add some test messages
        this.addMessage({
            id: 1,
            role: 'user',
            content: 'Hello, can you help me with penetration testing?',
            timestamp: new Date().toISOString(),
            run_id: 1,
            section_id: 1
        });
        
        this.addMessage({
            id: 2,
            role: 'assistant',
            content: 'I can help you with penetration testing. Let me start by gathering information.',
            timestamp: new Date().toISOString(),
            run_id: 1,
            section_id: 1
        });
        
        // Add some test tool calls
        this.addToolCall({
            id: 1,
            tool_name: 'nmap_scan',
            status: 'success',
            result: 'Found 3 open ports',
            timestamp: new Date().toISOString(),
            message_id: 2
        });
        
        this.addToolCall({
            id: 2,
            tool_name: 'vulnerability_scan',
            status: 'pending',
            result: '',
            timestamp: new Date().toISOString(),
            message_id: 2
        });
        
        console.log('Mock data loaded:', {
            nodes: this.nodes.length,
            links: this.links.length
        });
    }
}

// Initialize graph view when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.graphView = new GraphView();
});
