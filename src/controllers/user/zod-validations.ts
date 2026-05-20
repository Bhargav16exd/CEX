import * as z from "zod";

const signupValidatorZod = z.object({
  username:z.string(),
  password:z.string()
})

const signinValidatorZod = signupValidatorZod;

export {
  signupValidatorZod
}