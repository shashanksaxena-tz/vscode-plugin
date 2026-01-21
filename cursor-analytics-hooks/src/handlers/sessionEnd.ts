export async function handleSessionEnd(
  input: any
): Promise<object> {
  console.error('sessionEnd hook triggered', input);
  return {};
}
