declare module 'mediasoup-client' {
  export class Device {
    loaded: boolean;
    rtpCapabilities: Record<string, unknown>;
    load(opts: { routerRtpCapabilities: Record<string, unknown> }): Promise<void>;
    createSendTransport(opts: Record<string, unknown>): unknown;
    createRecvTransport(opts: Record<string, unknown>): unknown;
  }
}
