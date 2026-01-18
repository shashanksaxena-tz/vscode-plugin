export async function handleSessionEnd(
  input: any
): Promise<object> {
  console.log('sessionEnd hook triggered', input);
  return {};
}
