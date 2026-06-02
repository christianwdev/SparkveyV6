type FunctionResponse<T = void, E extends string = string> =
  | { ok: true, data: T }
  | { ok: false, error: E };

export default FunctionResponse;
