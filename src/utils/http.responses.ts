class HttpSuccessResponse {
    statusCode :number;
    success: boolean;
    message: string;
    data?: object;

    constructor(statusCode :number, success: boolean, message: string, data?: object){
        this.statusCode = statusCode;
        this.success = success;
        this.message = message;
        this.data = data || {} ;
    }
}

class HttpErrorResponse extends Error {
    statusCode :number;
    success: boolean;
    message: string;
    error?: Error;

    constructor(statusCode :number, success: boolean, message: string , err = [] as any , stack = ""){
        super(message)
        this.statusCode = statusCode;
        this.success = success;
        this.message = message;
        this.error = err;
        if(stack){
            this.stack = stack;
        }else{
            Error.captureStackTrace(this,this.constructor)
        }
    }
}

export {
    HttpSuccessResponse,
    HttpErrorResponse
}