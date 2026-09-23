export interface DeliveryDispatch {
  eventId: string;
  viewerToken: string;
  kind: "test" | "real";
}

export interface DeliveryAdapter {
  enqueue(dispatch: DeliveryDispatch): Promise<void>;
}

/** Day-2 adapter: the durable database row is the queue; no external message is sent. */
export class FakeDeliveryAdapter implements DeliveryAdapter {
  async enqueue(_dispatch: DeliveryDispatch): Promise<void> {}
}
