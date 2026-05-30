type FunctionResponse<T = undefined> = [ error: string ] | [ error: undefined, data: T ];

export default FunctionResponse;