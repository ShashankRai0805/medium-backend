import {Hono} from 'hono';
import { PrismaClient } from '@prisma/client/edge'
import { withAccelerate } from '@prisma/extension-accelerate'
import {decode, sign, verify} from 'hono/jwt'
import { signinInput, signupInput } from "medium-common-shashankrai";

export const userRouter = new Hono<{
    Bindings: {
        DATABASE_URL: string,
        JWT_SECRET: string
    }
}>();

userRouter.post('/signup', async (c) => {
  const body = await c.req.json();
  const {success, data, error} = signupInput.safeParse(body);
  if(!success){
    c.status(400);
    return c.json({
      error: "Invalid input",
      details: error.issues
    });
  }
  const prisma = new PrismaClient({
    datasourceUrl: c.env.DATABASE_URL,
  }).$extends(withAccelerate())

  try {
    const user = await prisma.user.create({
      data: {
        email: data.email,
        password: data.password,
        name: data.name
      }
    })
    const jwt = await sign({
      id: user.id
    }, c.env.JWT_SECRET)

    return c.json({
      message: "User created successfully",
      token: jwt
    });
    
  } catch (error) {
    console.error('Error creating user:', error);
    c.status(411);
    return c.json({
      error: "Invalid request"
    });
  }
})

userRouter.post('/signin', async (c) => {
  const body = await c.req.json();
  const {success, data, error} = signinInput.safeParse(body);
  if(!success){
    c.status(400);
    return c.json({
      error: "Invalid input",
      details: error.issues
    });
  }
  const prisma = new PrismaClient({
    datasourceUrl: c.env.DATABASE_URL,
  }).$extends(withAccelerate())

  try {
    const user = await prisma.user.findFirst({
      where: {
        email: data.email,
        password: data.password
      }
    })
    if(!user){
      c.status(403);
      return c.json({
        error: "Invalid credentials"
      });
    }
    const jwt = await sign({
      id: user.id
    }, c.env.JWT_SECRET);

    return c.json({
      message: "Login successful",
      token: jwt
    });
  } catch (error) {
    console.log(error);
    c.status(411);
    return c.json({
      error: "Invalid request"
    });
  }
})