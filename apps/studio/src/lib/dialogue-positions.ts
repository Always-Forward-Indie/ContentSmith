// Utility functions for managing node positions in localStorage

export interface NodePosition {
    x: number
    y: number
}

export interface DialogueLayoutData {
    [nodeId: string]: NodePosition
}

const STORAGE_KEY_PREFIX = 'dialogue_layout_'

export class DialoguePositionManager {
    private dialogueId: number

    constructor(dialogueId: number) {
        this.dialogueId = dialogueId
    }

    private getStorageKey(): string {
        return `${STORAGE_KEY_PREFIX}${this.dialogueId}`
    }

    // Get stored positions for this dialogue
    getStoredPositions(): DialogueLayoutData {
        try {
            const stored = localStorage.getItem(this.getStorageKey())
            return stored ? JSON.parse(stored) : {}
        } catch (error) {
            console.warn('Failed to load stored positions:', error)
            return {}
        }
    }

    // Save positions for this dialogue
    savePositions(positions: DialogueLayoutData): void {
        try {
            localStorage.setItem(this.getStorageKey(), JSON.stringify(positions))
        } catch (error) {
            console.warn('Failed to save positions:', error)
        }
    }

    // Update position for a single node
    updateNodePosition(nodeId: string, position: NodePosition): void {
        const current = this.getStoredPositions()
        current[nodeId] = position
        this.savePositions(current)
    }

    // Get position for a specific node, with fallback to auto-layout
    getNodePosition(nodeId: string, fallbackPosition?: NodePosition): NodePosition {
        const stored = this.getStoredPositions()
        
        if (stored[nodeId]) {
            return stored[nodeId]
        }

        // If no stored position, return fallback or auto-generated
        return fallbackPosition || this.generateAutoPosition(nodeId)
    }

    // Generate automatic position based on node ID
    private generateAutoPosition(nodeId: string): NodePosition {
        // Simple hash-based positioning to make it somewhat predictable
        const hash = this.simpleHash(nodeId)
        return {
            x: 100 + (hash % 600), // 100-700 range
            y: 100 + ((hash >> 8) % 400), // 100-500 range
        }
    }

    // Simple hash function for consistent positioning
    private simpleHash(str: string): number {
        let hash = 0
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i)
            hash = ((hash << 5) - hash) + char
            hash = hash & hash // Convert to 32-bit integer
        }
        return Math.abs(hash)
    }

    // Clear stored positions for this dialogue
    clearStoredPositions(): void {
        try {
            localStorage.removeItem(this.getStorageKey())
        } catch (error) {
            console.warn('Failed to clear positions:', error)
        }
    }

    // Auto-layout nodes in a hierarchical structure
    static autoLayoutNodes(nodes: any[]): DialogueLayoutData {
        const positions: DialogueLayoutData = {}
        const LEVEL_HEIGHT = 150
        const NODE_WIDTH = 200
        
        // Find start nodes (nodes without incoming edges)
        const nodeIds = new Set(nodes.map(n => n.id.toString()))
        const hasIncoming = new Set<string>()
        
        // This is a simple layout - in a real scenario you'd need edge data
        // For now, just arrange in a grid
        nodes.forEach((node, index) => {
            const row = Math.floor(index / 4)
            const col = index % 4
            
            positions[node.id.toString()] = {
                x: 50 + col * (NODE_WIDTH + 50),
                y: 50 + row * LEVEL_HEIGHT,
            }
        })
        
        return positions
    }

    // Export positions as JSON
    exportPositions(): string {
        return JSON.stringify(this.getStoredPositions(), null, 2)
    }

    // Import positions from JSON
    importPositions(json: string): boolean {
        try {
            const positions = JSON.parse(json)
            this.savePositions(positions)
            return true
        } catch (error) {
            console.error('Failed to import positions:', error)
            return false
        }
    }
}