import { NextRequest, NextResponse } from "next/server";
import { getAdminAuth, getAdminDb } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";

export async function POST(req: NextRequest) {
  // Basic session guard — cookie must be present
  const sessionCookie = req.cookies.get("auth-session");
  if (!sessionCookie) {
    return NextResponse.json(
      { success: false, error: "غير مصرّح بالوصول" },
      { status: 401 }
    );
  }

  let body: {
    email: string;
    username: string;
    password: string;
    displayName: string;
    role: "employee" | "viewer";
    createdBy: string;
  };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { success: false, error: "طلب غير صالح" },
      { status: 400 }
    );
  }

  const { email, username, password, displayName, role, createdBy } = body;

  // Validate required fields
  if (!email || !username || !password || !displayName || !role || !createdBy) {
    return NextResponse.json(
      { success: false, error: "جميع الحقول مطلوبة" },
      { status: 400 }
    );
  }

  if (password.length < 8) {
    return NextResponse.json(
      { success: false, error: "كلمة المرور يجب أن تكون 8 أحرف على الأقل" },
      { status: 400 }
    );
  }

  if (!["employee", "viewer"].includes(role)) {
    return NextResponse.json(
      { success: false, error: "الدور المحدد غير صالح" },
      { status: 400 }
    );
  }

  try {
    // Create the Firebase Auth user via Admin SDK
    const userRecord = await getAdminAuth().createUser({
      email,
      password,
      displayName,
    });

    const uid = userRecord.uid;

    // Create the Firestore users document
    await getAdminDb().collection("users").doc(uid).set({
      uid,
      email,
      username,
      displayName,
      role,
      isActive: true,
      createdAt: FieldValue.serverTimestamp(),
      createdBy,
    });

    return NextResponse.json({ success: true, uid }, { status: 201 });
  } catch (error: unknown) {
    console.error("Error creating user:", error);

    // Translate common Firebase Auth errors to Arabic
    let message = "حدث خطأ أثناء إنشاء الحساب";
    if (error instanceof Error) {
      const msg = error.message;
      if (msg.includes("email-already-exists")) {
        message = "البريد الإلكتروني مستخدم بالفعل";
      } else if (msg.includes("invalid-email")) {
        message = "البريد الإلكتروني غير صالح";
      } else if (msg.includes("weak-password")) {
        message = "كلمة المرور ضعيفة جدًا";
      }
    }

    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
