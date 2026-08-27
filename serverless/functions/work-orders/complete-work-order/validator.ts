export function validateWorkOrderId(id: string): string | null {
  if (!id || id.trim().length === 0) {
    return 'WORK_ORDER_ID_REQUIRED';
  }
  return null;
}
