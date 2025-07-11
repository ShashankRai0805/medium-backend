import { PrismaClient } from '@prisma/client/edge';
import { withAccelerate } from '@prisma/extension-accelerate';
import { Hono } from 'hono';
import { verify } from 'hono/jwt';
import { createBlogInput, updateBlogInput } from 'medium-common-shashankrai';

export const blogRouter = new Hono<{
    Bindings: {
        DATABASE_URL: string,
        JWT_SECRET: string
    },
    Variables: {
        userId: string
    }
}>();

blogRouter.use("/*", async (c, next) => {
    const token = c.req.header("Authorization") || "";
    const user = await verify(token, c.env.JWT_SECRET);
    try {
        if (user) {
            c.set("userId", user.id as string);
            await next();
        } else {
            c.status(403);
            return c.json({
                msg: "You are not authorized to access this resource"
            })
        }
    } catch (error) {
        c.status(403);
        return c.json({
            msg: "You are not authorized to access this resource"
        })
    }
})

blogRouter.post('/', async (c) => {
    const body = await c.req.json();
    const {success, data, error} = createBlogInput.safeParse(body);
    if(!success){
        c.status(400);
        return c.json({
            error: "Invalid input",
            details: error.issues
        });
    }
    
    const authorId = c.get("userId");
    const prisma = new PrismaClient({
        datasourceUrl: c.env.DATABASE_URL,
    }).$extends(withAccelerate())

    try {
        const blog = await prisma.blog.create({
            data: {
                title: data.title,
                content: data.content,
                authorId: parseInt(authorId)
            }
        })
        return c.json({
            id: blog.id,
            message: "Blog created successfully"
        })
    } catch (error) {
        console.error('Error creating blog:', error);
        c.status(411);
        return c.json({
            error: "Error while creating blog"
        })
    }
})

blogRouter.put('/', async (c) => {
    const body = await c.req.json();
    const {success, data, error} = updateBlogInput.safeParse(body);
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
        const blog = await prisma.blog.update({
            where: {
                id: data.id
            },
            data: {
                title: data.title,
                content: data.content
            }
        })
        return c.json({
            id: blog.id,
            message: "Blog updated successfully"
        })
    } catch (error) {
        console.error('Error updating blog:', error);
        c.status(411);
        return c.json({
            error: "Error while updating blog"
        })
    }
})

blogRouter.get('/bulk', async (c) => {
    const prisma = new PrismaClient({
        datasourceUrl: c.env.DATABASE_URL,
    }).$extends(withAccelerate())

    try {
        const blogs = await prisma.blog.findMany({
            select: {
                id: true,
                title: true,
                content: true,
                author: {
                    select: {
                        name: true
                    }
                }
            }
        });

        return c.json({
            blogs
        })
    } catch (error) {
        console.error('Error fetching blogs:', error);
        c.status(411);
        return c.json({
            error: "Error while fetching blogs"
        })
    }
})

blogRouter.get('/:id', async (c) => {
    const id = c.req.param('id');
    const prisma = new PrismaClient({
        datasourceUrl: c.env.DATABASE_URL,
    }).$extends(withAccelerate())

    try {
        const blog = await prisma.blog.findFirst({
            where: {
                id: parseInt(id)
            },
            select: {
                id: true,
                title: true,
                content: true,
                author: {
                    select: {
                        name: true
                    }
                }
            }
        })
        
        if (!blog) {
            c.status(404);
            return c.json({
                error: "Blog not found"
            })
        }
        
        return c.json({
            blog
        })
    } catch (error) {
        console.error('Error fetching blog:', error);
        c.status(411);
        return c.json({
            error: "Error while fetching blog"
        })
    }
})
