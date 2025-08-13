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
    this.layoutMode = 'flow'; // 'flow' | 'force'
    this.laneConfig = { user: 0.2, assistant: 0.5, tool: 0.8 };
    this.topMargin = 60;
    this.rowSpacing = 90;
        
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

    // keep a reference to the zoom behavior so control buttons can use it
    this.zoom = zoom;
    this.svg.call(this.zoom);
    // Click on empty canvas to clear selection
    this.svg.on('click', () => this.selectNode(null));

        // Create graph container (zoomed content)
        const graphContainer = this.svg.append("g")
            .attr("class", "graph-container");

        // Lane background layer (must be below links/nodes)
        this.laneLayer = graphContainer.append('g').attr('class', 'lane-layer');

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

    // Create force simulation (forces configured per layout mode)
    this.simulation = d3.forceSimulation();
    this.updateForces();

        this.addGraphControls();
    this.addLegend();
    this.renderLanes();
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
            display: flex;
            gap: 8px;
        `;

        // Create buttons with Material Icons as text content
        const buttons = [
            {
                class: 'zoom-in-btn',
                icon: 'zoom_in',
                tooltip: 'Zoom In',
                action: (e) => { e.stopPropagation(); this.zoomIn(); }
            },
            {
                class: 'zoom-out-btn', 
                icon: 'zoom_out',
                tooltip: 'Zoom Out',
                action: (e) => { e.stopPropagation(); this.zoomOut(); }
            },
            {
                class: 'reset-zoom-btn',
                icon: 'center_focus_strong',
                tooltip: 'Reset Zoom',
                action: (e) => { e.stopPropagation(); this.resetZoom(); }
            },
            {
                class: 'layout-toggle-btn',
                icon: 'view_timeline',
                tooltip: 'Toggle Layout (Flow/Force)',
                action: (e) => { e.stopPropagation(); this.toggleLayout(); }
            }
        ];

        buttons.forEach(buttonConfig => {
            const button = document.createElement('button');
            button.className = `graph-control-button ${buttonConfig.class}`;
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
            button.setAttribute('aria-label', buttonConfig.tooltip);
            button.setAttribute('data-tooltip', buttonConfig.tooltip);
            button.addEventListener('click', (ev) => buttonConfig.action(ev));
            button.addEventListener('pointerdown', (ev) => ev.stopPropagation());
            
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

    toggleLayout() {
        this.layoutMode = this.layoutMode === 'flow' ? 'force' : 'flow';
        const btn = document.querySelector('.layout-toggle-btn');
        if (btn) {
            const tip = this.layoutMode === 'flow' ? 'Switch to Force Layout' : 'Switch to Flow Layout';
            btn.title = tip;
            btn.setAttribute('data-tooltip', tip);
            btn.setAttribute('aria-label', tip);
            btn.innerHTML = this.layoutMode === 'flow' ? 'view_timeline' : 'scatter_plot';
        }
        this.updateForces();
        this.renderLanes();
        this.simulation.alpha(0.6).restart();
    }

    renderLanes() {
        if (!this.laneLayer) return;
        const lanes = [
            { key: 'user', label: 'User', x: this.getLaneX({ type: 'message', role: 'user' }) },
            { key: 'assistant', label: 'Assistant', x: this.getLaneX({ type: 'message', role: 'assistant' }) },
            { key: 'tool', label: 'Tools', x: this.getLaneX({ type: 'tool_call' }) }
        ];

        const laneWidth = Math.max(140, this.width * 0.22);
        const height = this.height;

        // Data join for backgrounds
        const bg = this.laneLayer.selectAll('.lane-bg')
            .data(lanes, d => d.key);
        bg.exit().remove();
        bg.enter().append('rect')
            .attr('class', 'lane-bg')
            .attr('y', 0)
            .attr('rx', 16)
            .attr('ry', 16)
            .attr('fill', 'var(--md-sys-color-surface-container-high)')
            .attr('fill-opacity', 0.25)
            .merge(bg)
            .attr('x', d => d.x - laneWidth / 2)
            .attr('width', laneWidth)
            .attr('height', height);

        // Data join for labels
        const labels = this.laneLayer.selectAll('.lane-label')
            .data(lanes, d => d.key);
        labels.exit().remove();
        labels.enter().append('text')
            .attr('class', 'lane-label')
            .attr('text-anchor', 'middle')
            .attr('fill', 'var(--md-sys-color-on-surface-variant)')
            .attr('font-size', 12)
            .attr('font-weight', 600)
            .merge(labels)
            .attr('x', d => d.x)
            .attr('y', 20)
            .text(d => d.label);
    }

    updateForces() {
        if (!this.simulation) return;
        if (this.layoutMode === 'flow') {
            // Assign sequence indices for vertical ordering
            this.assignSequenceIndices();

            this.simulation
                .force('link', d3.forceLink().id(d => d.id).distance(140).strength(0.7))
                .force('charge', d3.forceManyBody().strength(-200).distanceMax(280))
                .force('collision', d3.forceCollide().radius(d => this.getNodeRadius(d) + 8).strength(0.9))
                .force('x', d3.forceX(d => this.getLaneX(d)).strength(1.0))
                .force('y', d3.forceY(d => this.getTargetY(d)).strength(1.0))
                .force('center', null);
        } else {
            this.simulation
                .force('link', d3.forceLink().id(d => d.id).distance(120).strength(0.8))
                .force('charge', d3.forceManyBody().strength(-400).distanceMax(300))
                .force('collision', d3.forceCollide().radius(35).strength(0.7))
                .force('x', d3.forceX(this.width / 2).strength(0.1))
                .force('y', d3.forceY(this.height / 2).strength(0.1))
                .force('center', d3.forceCenter(this.width / 2, this.height / 2));
        }
    }

    assignSequenceIndices() {
        // Sort by timestamp; fallback to stable order
        const parseTime = (t) => (t ? new Date(t).getTime() : Date.now());
        const sorted = [...this.nodes].sort((a, b) => parseTime(a.timestamp) - parseTime(b.timestamp));
        sorted.forEach((n, i) => { n.seq = i; });
    }

    getTargetY(d) {
        const idx = typeof d.seq === 'number' ? d.seq : 0;
        const y = this.topMargin + idx * this.rowSpacing;
        return Math.min(Math.max(y, this.topMargin), this.height - 40);
    }

    getLaneX(d) {
        const w = this.width;
        if (d.type === 'message') {
            if (d.role === 'user') return w * this.laneConfig.user;
            if (d.role === 'assistant') return w * this.laneConfig.assistant;
        }
        if (d.type === 'tool_call') return w * this.laneConfig.tool;
        return w * 0.6;
    }

    addLegend() {
        // Remove existing legend if any
        const existing = document.querySelector('.graph-legend');
        if (existing) existing.remove();

        const graphViewContainer = document.getElementById('graph-view');
        if (!graphViewContainer) return;

        const legend = document.createElement('div');
        legend.className = 'graph-legend';
        legend.innerHTML = `
            <div class="legend-section">
                <div class="legend-title">Nodes</div>
                <div class="legend-items">
                    <div class="legend-item"><span class="legend-node user"></span>User</div>
                    <div class="legend-item"><span class="legend-node assistant"></span>Assistant</div>
                    <div class="legend-item"><span class="legend-node tool"></span>Tool Call</div>
                    <div class="legend-item"><span class="legend-node error"></span>Error</div>
                </div>
            </div>
            <div class="legend-section">
                <div class="legend-title">Edges</div>
                <div class="legend-items">
                    <div class="legend-item"><span class="legend-edge message_flow"></span>Message Flow</div>
                    <div class="legend-item"><span class="legend-edge tool_call"></span>Tool Call</div>
                    <div class="legend-item"><span class="legend-edge reference"></span>Reference</div>
                </div>
            </div>
        `;
        graphViewContainer.appendChild(legend);
    }

    zoomIn() {
        if (!this.svg) return;
        console.log('Zooming in...');
        
        const currentTransform = d3.zoomTransform(this.svg.node());
        const newScale = Math.min(currentTransform.k * 1.5, 4); // Max zoom = 4x
        
        this.svg.transition()
            .duration(300)
            .call(
                this.zoom.transform,
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
                this.zoom.transform,
                d3.zoomIdentity.translate(currentTransform.x, currentTransform.y).scale(newScale)
            );
    }

    resetZoom() {
        if (!this.svg) return;
        console.log('Resetting zoom...');
        
        this.svg.transition()
            .duration(500)
            .call(
                this.zoom.transform,
                d3.zoomIdentity
            );
    }

    setupEventListeners() {
        // Toggle view button
        const toggleBtn = document.getElementById('view-toggle');
        // Ensure initial tooltip for view toggle exists
        if (toggleBtn) {
            toggleBtn.setAttribute('data-tooltip', this.isGraphView ? 'Switch to List View' : 'Switch to Graph View');
            toggleBtn.setAttribute('aria-label', this.isGraphView ? 'Switch to List View' : 'Switch to Graph View');
        }
        if (toggleBtn) {
            toggleBtn.addEventListener('click', () => this.toggleView());
        }

        // Window resize handler
        window.addEventListener('resize', () => this.handleResize());

    // Removed graph debug controls (test/clear); functionality now via app bar
        
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

        // Close node details button
        const closeDetailsBtn = document.getElementById('close-details');
        if (closeDetailsBtn) {
            closeDetailsBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.selectNode(null);
            });
        }
    }

    toggleView() {
        this.isGraphView = !this.isGraphView;
        
        const listContainer = document.getElementById('list-view');
        const graphContainer = document.getElementById('graph-view');
        const toggleBtn = document.getElementById('view-toggle');
        
        if (this.isGraphView) {
            listContainer.style.display = 'none';
            graphContainer.style.display = 'flex';
            // Disable page/content scrolling when in graph view
            try {
                // Remember previous overflow to restore later
                if (typeof document !== 'undefined' && document.body) {
                    if (!document.body.dataset.prevOverflow) {
                        document.body.dataset.prevOverflow = document.body.style.overflow || '';
                    }
                    document.body.style.overflow = 'hidden';
                }
                if (graphContainer) {
                    graphContainer.style.overflow = 'hidden';
                }
            } catch (e) {
                console.warn('Failed to adjust scroll behavior for graph view:', e);
            }
            if (toggleBtn) {
                const icon = toggleBtn.querySelector('.material-icons');
                if (icon) icon.textContent = 'list';
                toggleBtn.setAttribute('data-tooltip', 'Switch to List View');
                toggleBtn.setAttribute('aria-label', 'Switch to List View');
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
            // Restore page/content scrolling when leaving graph view
            try {
                if (typeof document !== 'undefined' && document.body) {
                    const prev = document.body.dataset.prevOverflow || '';
                    document.body.style.overflow = prev;
                    delete document.body.dataset.prevOverflow;
                }
                if (graphContainer) {
                    graphContainer.style.overflow = '';
                }
            } catch (e) {
                console.warn('Failed to restore scroll behavior after graph view:', e);
            }
            if (toggleBtn) {
                const icon = toggleBtn.querySelector('.material-icons');
                if (icon) icon.textContent = 'account_tree';
                toggleBtn.setAttribute('data-tooltip', 'Switch to Graph View');
                toggleBtn.setAttribute('aria-label', 'Switch to Graph View');
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
        
    this.updateForces();
    this.renderLanes();
    this.simulation.alpha(0.3).restart();
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
    // Ensure lanes are up-to-date
    this.renderLanes();
    this.updateForces();

        // Update links as curved paths with labels
        const link = graphContainer.selectAll(".graph-link")
            .data(this.links, d => `${d.source.id || d.source}-${d.target.id || d.target}-${d.type || ''}`);

        link.exit().remove();

        const linkEnter = link.enter().append("path")
            .attr("class", d => `graph-link ${d.type}`)
            .attr("fill", "none")
            .attr("stroke", d => this.getLinkColor(d.type))
            .attr("stroke-width", d => this.getLinkWidth(d.type))
            .attr("stroke-dasharray", d => d.type === 'tool_call' ? "6,4" : "none")
            .attr("marker-end", d => d.type === 'tool_call' ? 
                "url(#arrowhead-tool)" : (d.type === 'reference' ? null : "url(#arrowhead)"))
            .attr("opacity", 0.9);

        const linkUpdate = linkEnter.merge(link);

        // Edge labels
        const linkLabel = graphContainer.selectAll('.link-label')
            .data(this.links, d => `label-${d.source.id || d.source}-${d.target.id || d.target}-${d.type || ''}`);

        linkLabel.exit().remove();

        const linkLabelEnter = linkLabel.enter().append('text')
            .attr('class', 'link-label')
            .attr('text-anchor', 'middle')
            .attr('dy', '-4px')
            .text(d => d.label || d.message || d.type || '');
        const linkLabelUpdate = linkLabelEnter.merge(linkLabel);

        // Update nodes with enhanced Material You design
    const node = graphContainer.selectAll(".graph-node")
            .data(this.nodes, d => d.id);

        node.exit().remove();

        const nodeEnter = node.enter().append("g")
            .attr("class", d => `graph-node node-${d.type === 'message' ? d.role : 'tool'}${d.status === 'error' ? ' status-error' : ''}`)
            .call(this.drag());

    // Add enhanced circles for Material You feel
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

        // Add native SVG tooltip to explain node purpose
        nodeEnter.append('title')
            .text(d => {
                if (d.type === 'message') {
                    return d.role === 'user' ? 'User message' : 'Assistant message';
                }
                if (d.type === 'tool_call') {
                    const name = d.tool_name || 'Tool';
                    return `Tool call: ${name}`;
                }
                return 'Node';
            });

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
            // Update curved path between nodes
            linkUpdate
                .attr('d', d => {
                    const sx = d.source.x, sy = d.source.y;
                    const tx = d.target.x, ty = d.target.y;
                    const dx = tx - sx, dy = ty - sy;
                    const dr = Math.sqrt(dx*dx + dy*dy) * 0.6; // curvature
                    const mx = (sx + tx) / 2;
                    const my = (sy + ty) / 2;
                    // Control point perpendicular offset for smooth curve
                    const nx = -dy, ny = dx;
                    const norm = Math.max(Math.sqrt(nx*nx + ny*ny), 1);
                    const offset = Math.min(40, dr * 0.3);
                    const cx = mx + (nx / norm) * offset;
                    const cy = my + (ny / norm) * offset;
                    return `M ${sx},${sy} Q ${cx},${cy} ${tx},${ty}`;
                });

            // Position edge labels near the middle
            linkLabelUpdate
                .attr('x', d => (d.source.x + d.target.x) / 2)
                .attr('y', d => (d.source.y + d.target.y) / 2);

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
                return node.role === 'user' ? 'person' : 'agent';
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
            case 'reference':
                return 'var(--md-sys-color-outline-variant)';
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
            case 'reference':
                return 1.5;
            default:
                return 1;
        }
    }

    highlightConnections(node) {
        // Highlight all links connected to the selected node
        const isRelated = (d) => (d.source.id === node.id || d.target.id === node.id) || (d.source === node.id || d.target === node.id);
        this.svg.selectAll('.graph-link')
            .attr('opacity', d => isRelated(d) ? 1 : 0.2)
            .attr('stroke-width', d => isRelated(d) ? this.getLinkWidth(d.type) + 1 : this.getLinkWidth(d.type));
        this.svg.selectAll('.link-label')
            .attr('opacity', d => isRelated(d) ? 1 : 0.15);
        this.svg.selectAll('.graph-node circle')
            .attr('opacity', d => (d.id === node.id ? 1 : 0.6));
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
        this.svg.selectAll(".graph-node circle")
            .attr("stroke-width", d => d === node ? 4 : 2)
            .attr("stroke", d => d === node ? 
                "var(--md-sys-color-primary)" : 
                "var(--md-sys-color-outline)");
        
        if (node) {
            this.showNodeDetails(node);
            this.highlightConnections(node);
        } else {
            this.hideNodeDetails();
            // Reset highlights
            this.svg.selectAll('.graph-link')
                .attr('opacity', 0.9)
                .attr('stroke-width', d => this.getLinkWidth(d.type));
            this.svg.selectAll('.link-label').attr('opacity', 1);
            this.svg.selectAll('.graph-node circle').attr('opacity', 1);
        }
    }

    showNodeDetails(node) {
        const detailsPanel = document.getElementById('node-details');
        const detailsContent = document.getElementById('details-content');
        if (!detailsPanel || !detailsContent) return;

        // Ensure panel class and open state
        detailsPanel.classList.add('node-details-panel', 'open');

        // Populate details based on node type
        let detailsHTML = '';
        
        if (node.type === 'message') {
            detailsHTML = `
                <div class="detail-header">
                    <span class="material-icons">${node.role === 'user' ? 'person' : 'agent'}</span>
                    <h3>${node.role === 'user' ? 'User Message' : 'Assistant Message'}</h3>
                </div>
                <div class="detail-content">
                    <div class="detail-field"><label>Role</label><div class="detail-text">${node.role}</div></div>
                    <div class="detail-field"><label>Timestamp</label><div class="detail-text">${new Date(node.timestamp).toLocaleString()}</div></div>
                    <div class="detail-field"><label>Run ID</label><div class="detail-text">${node.run_id || 'Unknown'}</div></div>
                    <div class="detail-field full"><label>Content</label><pre class="detail-pre">${node.content || 'No content'}</pre></div>
                </div>
            `;
        } else if (node.type === 'tool_call') {
            detailsHTML = `
                <div class="detail-header">
                    <span class="material-icons">build</span>
                    <h3>Tool Call</h3>
                </div>
                <div class="detail-content">
                    <div class="detail-field"><label>Tool Name</label><div class="detail-text">${node.tool_name || 'Unknown'}</div></div>
                    <div class="detail-field"><label>Status</label><div class="detail-text status-${node.status}">${node.status || 'Unknown'}</div></div>
                    <div class="detail-field"><label>Timestamp</label><div class="detail-text">${new Date(node.timestamp).toLocaleString()}</div></div>
                    <div class="detail-field full"><label>Arguments</label><pre class="detail-pre">${node.arguments || ''}</pre></div>
                    <div class="detail-field full"><label>Result</label><pre class="detail-pre">${node.result || 'No result'}</pre></div>
                </div>
            `;
        }

    detailsContent.innerHTML = detailsHTML;
    detailsPanel.style.display = 'block';
    }

    hideNodeDetails() {
        const detailsPanel = document.getElementById('node-details');
        if (detailsPanel) {
            detailsPanel.classList.remove('open');
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
