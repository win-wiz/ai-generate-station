import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { users, posts } from "@/server/db/schema";
import { eq, desc } from "drizzle-orm";

export const runtime = "edge";

/**
 * GET /api/example - 获取用户和文章示例
 */
export async function GET(request: NextRequest) {
  try {
    // 获取查询参数
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");

    if (userId) {
      // 查询特定用户的信息
      const user = await db
        .select()
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);

      if (user.length === 0) {
        return NextResponse.json(
          { error: "用户不存在" },
          { status: 404 }
        );
      }

      // 查询用户的文章
      const userPosts = await db
        .select()
        .from(posts)
        .where(eq(posts.createdById, userId))
        .orderBy(desc(posts.createdAt))
        .limit(10);

      return NextResponse.json({
        user: user[0],
        posts: userPosts,
        totalPosts: userPosts.length
      });
    } else {
      // 查询所有用户
      const allUsers = await db
        .select({
          id: users.id,
          name: users.name,
          email: users.email,
          image: users.image
        })
        .from(users)
        .limit(10);

      return NextResponse.json({
        users: allUsers,
        total: allUsers.length
      });
    }
  } catch (error) {
    console.error("API 错误:", error);
    return NextResponse.json(
      { error: "服务器内部错误" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/example - 创建新用户示例
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, email, image } = body;

    // 验证必填字段
    if (!name || !email) {
      return NextResponse.json(
        { error: "姓名和邮箱是必填字段" },
        { status: 400 }
      );
    }

    // 检查邮箱是否已存在
    const existingUser = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (existingUser.length > 0) {
      return NextResponse.json(
        { error: "该邮箱已被使用" },
        { status: 409 }
      );
    }

    // 创建新用户
    const newUser = await db
      .insert(users)
      .values({
        name,
        email,
        image: image || null
      })
      .returning();

    return NextResponse.json(
      {
        message: "用户创建成功",
        user: newUser[0]
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("创建用户错误:", error);
    return NextResponse.json(
      { error: "创建用户失败" },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/example - 更新用户示例
 */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, name, email, image } = body;

    if (!id) {
      return NextResponse.json(
        { error: "用户 ID 是必填字段" },
        { status: 400 }
      );
    }

    // 检查用户是否存在
    const existingUser = await db
      .select()
      .from(users)
      .where(eq(users.id, id))
      .limit(1);

    if (existingUser.length === 0) {
      return NextResponse.json(
        { error: "用户不存在" },
        { status: 404 }
      );
    }

    // 更新用户信息
    const updatedUser = await db
      .update(users)
      .set({
        ...(name && { name }),
        ...(email && { email }),
        ...(image !== undefined && { image })
      })
      .where(eq(users.id, id))
      .returning();

    return NextResponse.json({
      message: "用户更新成功",
      user: updatedUser[0]
    });
  } catch (error) {
    console.error("更新用户错误:", error);
    return NextResponse.json(
      { error: "更新用户失败" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/example - 删除用户示例
 */
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");

    if (!userId) {
      return NextResponse.json(
        { error: "用户 ID 是必填参数" },
        { status: 400 }
      );
    }

    // 检查用户是否存在
    const existingUser = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (existingUser.length === 0) {
      return NextResponse.json(
        { error: "用户不存在" },
        { status: 404 }
      );
    }

    // 先删除用户的文章
    await db.delete(posts).where(eq(posts.createdById, userId));

    // 删除用户
    await db.delete(users).where(eq(users.id, userId));

    return NextResponse.json({
      message: "用户删除成功"
    });
  } catch (error) {
    console.error("删除用户错误:", error);
    return NextResponse.json(
      { error: "删除用户失败" },
      { status: 500 }
    );
  }
}