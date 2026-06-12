export interface Tagged {
  type: string;
}

export type MessageHandler<
  Message extends Tagged,
  Type extends Message['type'],
  Context,
> = (message: Extract<Message, { type: Type }>, context: Context) => void;

type AnyHandler<Message, Context> = (message: Message, context: Context) => void;

/**
 * Typed dispatcher for tagged-union messages. Register one handler per `type`;
 * dispatch narrows the message to that variant. Used on both ends of the WS
 * connection instead of hand-written switch statements.
 */
export class MessageRouter<Message extends Tagged, Context = void> {
  private readonly handlers = new Map<string, AnyHandler<Message, Context>>();

  on<Type extends Message['type']>(
    type: Type,
    handler: MessageHandler<Message, Type, Context>,
  ): this {
    this.handlers.set(type, handler as unknown as AnyHandler<Message, Context>);
    return this;
  }

  /** Run the handler registered for the message's type. Returns false if none. */
  dispatch(message: Message, context: Context): boolean {
    const handler = this.handlers.get(message.type);
    if (!handler) return false;
    handler(message, context);
    return true;
  }
}
