/**
 * Whether a getChatMember payload means this Bale user is currently in
 * the group. Left / kicked / unknown statuses keep the password gate.
 */
export function isSeatedInGroup(member: {
  status: string;
  is_member?: boolean;
}): boolean {
  if (
    member.status === 'creator' ||
    member.status === 'administrator' ||
    member.status === 'member'
  ) {
    return true;
  }
  if (member.status === 'restricted') return member.is_member !== false;
  return false;
}

export interface GroupMemberLookup {
  getChatMember?(params: {
    chat_id: number | string;
    user_id: number;
  }): Promise<{ status: string; is_member?: boolean }>;
}

/** True when the bot can see this user in `chatId`. API errors mean "not in". */
export async function baleUserInOriginChat(
  bot: GroupMemberLookup | undefined,
  chatId: number | undefined,
  userId: number,
): Promise<boolean> {
  if (chatId == null || !bot?.getChatMember) return false;
  try {
    const member = await bot.getChatMember({ chat_id: chatId, user_id: userId });
    return isSeatedInGroup(member);
  } catch {
    return false;
  }
}
