import type { Response } from 'express';
import type { StreamEvent } from '../../types/index.js';

class SseManager {
  private clients: Set<Response> = new Set();
  private heartbeatTimer: NodeJS.Timeout | null = null;

  constructor() {
    this.startHeartbeat();
  }

  addClient(res: Response): void {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'X-Accel-Buffering': 'no',
    });

    res.write(`data: ${JSON.stringify({ type: 'CONNECTED', message: 'ConsentGuard Real-Time SSE Fabric Active', timestamp: new Date().toISOString() })}\n\n`);

    this.clients.add(res);

    res.on('close', () => {
      this.clients.delete(res);
    });
  }

  broadcast(event: StreamEvent): void {
    const payload = `data: ${JSON.stringify(event)}\n\n`;
    for (const client of this.clients) {
      try {
        client.write(payload);
      } catch {
        this.clients.delete(client);
      }
    }
  }

  getClientCount(): number {
    return this.clients.size;
  }

  private startHeartbeat(): void {
    this.heartbeatTimer = setInterval(() => {
      for (const client of this.clients) {
        try {
          client.write(': keepalive\n\n');
        } catch {
          this.clients.delete(client);
        }
      }
    }, 15000);
  }

  destroy(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
    }
    for (const client of this.clients) {
      try {
        client.end();
      } catch {}
    }
    this.clients.clear();
  }
}

export const sseManager = new SseManager();
