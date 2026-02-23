"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

type Role = "admin" | "teacher" | "student";
type AttendanceStatus = "present" | "absent" | "late" | "excused";

type AuthTokens = {
  access_token: string;
  refresh_token: string;
};

type UserProfile = {
  userId: string;
  email: string;
  role: Role;
};

type UserRef = {
  _id?: string;
  fullName?: string;
  email?: string;
  studentId?: string;
  role?: Role;
  department?: string;
};

type Course = {
  _id: string;
  courseCode: string;
  courseName: string;
  teacherId?: string | UserRef;
  studentIds?: Array<string | UserRef>;
  semester?: number;
  academicYear?: number;
  roomLocation?: string;
};

type AttendanceRecord = {
  _id: string;
  classDate: string;
  status: AttendanceStatus;
  remarks?: string;
  studentId?: string | UserRef;
  recordedBy?: string | UserRef;
};

const STORAGE_KEY = "attendance-auth";
const DEFAULT_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:3000";

export default function AdminPage() {
  const router = useRouter();
  const baseUrl = DEFAULT_BASE_URL;

  const [tokens, setTokens] = useState<AuthTokens | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState<string>("");
  const [courseAttendance, setCourseAttendance] = useState<AttendanceRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [teacherOptions, setTeacherOptions] = useState<UserRef[]>([]);
  const [studentOptions, setStudentOptions] = useState<UserRef[]>([]);

  // ── Create User Form State ────────────────────────────────────────
  const [newUserRole, setNewUserRole] = useState<"student" | "teacher">("student");
  const [newUserEmail, setNewUserEmail] = useState("");
  const [newUserPassword, setNewUserPassword] = useState("");
  const [newUserFullName, setNewUserFullName] = useState("");
  const [newUserStudentId, setNewUserStudentId] = useState("");
  const [newUserDepartment, setNewUserDepartment] = useState("");

  // ── Create Course Form State ──────────────────────────────────────
  const [newCourseCode, setNewCourseCode] = useState("");
  const [newCourseName, setNewCourseName] = useState("");
  const [newCourseDescription, setNewCourseDescription] = useState("");
  const [newCourseTeacherId, setNewCourseTeacherId] = useState("");
  const [newCourseDepartment, setNewCourseDepartment] = useState("");
  const [newCourseRoomLocation, setNewCourseRoomLocation] = useState("");
  const [newCourseSemester, setNewCourseSemester] = useState("1");
  const [newCourseAcademicYear, setNewCourseAcademicYear] = useState(
    new Date().getFullYear().toString()
  );
  const [newCourseTotalClasses, setNewCourseTotalClasses] = useState("15");
  const [newCourseCredits, setNewCourseCredits] = useState("3");
  const [newCourseStudentIds, setNewCourseStudentIds] = useState<string[]>([]);

  // ── Record Attendance Form State ──────────────────────────────────
  const [studentId, setStudentId] = useState("");
  const [classDate, setClassDate] = useState(() =>
    new Date().toISOString().slice(0, 16)
  );
  const [status, setStatus] = useState<AttendanceStatus>("present");
  const [remarks, setRemarks] = useState("");
  const [sessionNumber, setSessionNumber] = useState("");

  const selectedCourse = useMemo(
    () => courses.find((c) => c._id === selectedCourseId) ?? null,
    [courses, selectedCourseId]
  );

  // Auto-select first teacher if available
  useEffect(() => {
    if (!newCourseTeacherId && teacherOptions.length > 0) {
      setNewCourseTeacherId(teacherOptions[0]._id ?? "");
    }
  }, [teacherOptions, newCourseTeacherId]);

  // Load tokens from localStorage on mount
  useEffect(() => {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;

    try {
      const parsed = JSON.parse(raw) as { tokens: AuthTokens };
      if (parsed.tokens?.access_token && parsed.tokens?.refresh_token) {
        setTokens(parsed.tokens);
      }
    } catch {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  const resetNotice = useCallback(() => {
    setError("");
    setSuccess("");
  }, []);

  const logout = useCallback(async () => {
    resetNotice();
    if (!tokens) return;

    try {
      await fetch(`${baseUrl}/auth/logout`, {
        method: "POST",
        headers: { Authorization: `Bearer ${tokens.access_token}` },
      });
    } catch {
      // silent fail
    }

    localStorage.removeItem(STORAGE_KEY);
    setTokens(null);
    setProfile(null);
    setCourses([]);
    setCourseAttendance([]);
    router.push("/");
  }, [tokens, baseUrl, router, resetNotice]);

  const authHeaders = (token: string) => ({
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  });

  const refreshAccessToken = async (refreshToken: string): Promise<AuthTokens> => {
    const res = await fetch(`${baseUrl}/auth/refresh`, {
      method: "POST",
      headers: { Authorization: `Bearer ${refreshToken}` },
    });

    if (!res.ok) throw new Error("Session expired. Please sign in again.");

    return res.json();
  };

  const callWithAuth = useCallback(
    async (path: string, init: RequestInit = {}): Promise<Response> => {
      if (!tokens) throw new Error("Please sign in first.");

      let res = await fetch(`${baseUrl}${path}`, {
        ...init,
        headers: {
          ...init.headers,
          Authorization: `Bearer ${tokens.access_token}`,
        },
      });

      if (res.status !== 401) return res;

      // Token expired → refresh
      const newTokens = await refreshAccessToken(tokens.refresh_token);
      setTokens(newTokens);

      res = await fetch(`${baseUrl}${path}`, {
        ...init,
        headers: {
          ...init.headers,
          Authorization: `Bearer ${newTokens.access_token}`,
        },
      });

      return res;
    },
    [tokens, baseUrl]
  );

  const loadInitialData = useCallback(
    async (activeTokens: AuthTokens) => {
      resetNotice();
      setIsLoading(true);

      try {
        const profileRes = await fetch(`${baseUrl}/auth/profile`, {
          headers: { Authorization: `Bearer ${activeTokens.access_token}` },
        });
        if (!profileRes.ok) throw new Error("Cannot load profile");

        const me = (await profileRes.json()) as UserProfile;
        if (me.role !== "admin") {
          if (me.role === "teacher") router.push("/teacher");
          if (me.role === "student") router.push("/student");
          return;
        }

        setProfile(me);

        const [coursesRes, teachersRes, studentsRes] = await Promise.all([
          fetch(`${baseUrl}/courses`, {
            headers: { Authorization: `Bearer ${activeTokens.access_token}` },
          }),
          fetch(`${baseUrl}/users/teachers`, {
            headers: { Authorization: `Bearer ${activeTokens.access_token}` },
          }),
          fetch(`${baseUrl}/users/students`, {
            headers: { Authorization: `Bearer ${activeTokens.access_token}` },
          }),
        ]);

        if (!coursesRes.ok) throw new Error("Cannot load courses");
        const allCourses = (await coursesRes.json()) as Course[];
        setCourses(allCourses);

        if (!selectedCourseId && allCourses.length > 0) {
          setSelectedCourseId(allCourses[0]._id);
        }

        if (teachersRes.ok) setTeacherOptions(await teachersRes.json());
        if (studentsRes.ok) setStudentOptions(await studentsRes.json());
      } catch (err: any) {
        const msg = err.message || "Failed to initialize";
        setError(msg);

        if (msg.toLowerCase().includes("session")) {
          localStorage.removeItem(STORAGE_KEY);
          setTokens(null);
          router.push("/");
        }
      } finally {
        setIsLoading(false);
      }
    },
    [baseUrl, router, selectedCourseId, resetNotice]
  );

  useEffect(() => {
    if (!tokens) {
      setProfile(null);
      setCourses([]);
      setSelectedCourseId("");
      return;
    }

    localStorage.setItem(STORAGE_KEY, JSON.stringify({ tokens }));
    void loadInitialData(tokens);
  }, [tokens, loadInitialData]);

  // ── Handlers ──────────────────────────────────────────────────────

  const loadAttendanceForCourse = async (courseId: string) => {
    resetNotice();
    setIsLoading(true);

    try {
      const res = await callWithAuth(`/attendance/course/${courseId}`);
      if (!res.ok) throw new Error("Cannot load attendance");

      setCourseAttendance(await res.json());
    } catch (err: any) {
      setError(err.message || "Failed to load attendance");
    } finally {
      setIsLoading(false);
    }
  };

  const recordAttendance = async (e: FormEvent) => {
    e.preventDefault();
    if (!selectedCourseId) {
      setError("กรุณาเลือกวิชาก่อนบันทึก");
      return;
    }

    resetNotice();
    setIsLoading(true);

    try {
      const res = await callWithAuth("/attendance", {
        method: "POST",
        body: JSON.stringify({
          courseId: selectedCourseId,
          studentId,
          classDate: new Date(classDate).toISOString(),
          status,
          remarks: remarks || undefined,
          sessionNumber: sessionNumber ? Number(sessionNumber) : undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || "บันทึกไม่สำเร็จ");
      }

      setSuccess("บันทึกการเข้าเรียนเรียบร้อย");
      setStudentId("");
      setRemarks("");
      setSessionNumber("");
      await loadAttendanceForCourse(selectedCourseId);
    } catch (err: any) {
      setError(err.message || "เกิดข้อผิดพลาดในการบันทึก");
    } finally {
      setIsLoading(false);
    }
  };

  const createUserByAdmin = async (e: FormEvent) => {
    e.preventDefault();
    resetNotice();
    setIsLoading(true);

    try {
      const payload: Record<string, any> = {
        email: newUserEmail,
        password: newUserPassword,
        fullName: newUserFullName,
        role: newUserRole,
        department: newUserDepartment,
      };

      if (newUserRole === "student" && newUserStudentId.trim()) {
        payload.studentId = newUserStudentId.trim();
      }

      const res = await callWithAuth("/users", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || "สร้างผู้ใช้ไม่สำเร็จ");
      }

      setSuccess(`สร้าง ${newUserRole} สำเร็จ`);
      setNewUserEmail("");
      setNewUserPassword("");
      setNewUserFullName("");
      setNewUserStudentId("");
      setNewUserDepartment("");

      // Refresh lists
      const [tRes, sRes] = await Promise.all([
        callWithAuth("/users/teachers"),
        callWithAuth("/users/students"),
      ]);
      if (tRes.ok) setTeacherOptions(await tRes.json());
      if (sRes.ok) setStudentOptions(await sRes.json());
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const createCourseByAdmin = async (e: FormEvent) => {
    e.preventDefault();
    resetNotice();
    setIsLoading(true);

    try {
      const res = await callWithAuth("/courses", {
        method: "POST",
        body: JSON.stringify({
          courseCode: newCourseCode,
          courseName: newCourseName,
          description: newCourseDescription,
          teacherId: newCourseTeacherId,
          department: newCourseDepartment,
          roomLocation: newCourseRoomLocation,
          semester: Number(newCourseSemester),
          academicYear: Number(newCourseAcademicYear),
          totalClasses: Number(newCourseTotalClasses),
          credits: Number(newCourseCredits),
          studentIds: newCourseStudentIds.length ? newCourseStudentIds : undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || "สร้างรายวิชาไม่สำเร็จ");
      }

      setSuccess("สร้างรายวิชาสำเร็จ");
      // Reset form
      setNewCourseCode("");
      setNewCourseName("");
      setNewCourseDescription("");
      setNewCourseRoomLocation("");
      setNewCourseStudentIds([]);

      // Refresh course list
      const coursesRes = await callWithAuth("/courses");
      if (coursesRes.ok) setCourses(await coursesRes.json());
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  // ── Render ─────────────────────────────────────────────────────────

  return (
    <main className="min-h-screen bg-gray-50 text-gray-900">
      <div className="mx-auto max-w-6xl px-5 py-10 md:px-8 lg:px-12">
        {/* Header */}
        <div className="mb-10 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-gray-900 md:text-4xl">
              Admin Dashboard
            </h1>
            <p className="mt-2 text-gray-600">
              จัดการผู้ใช้ รายวิชา ห้องเรียน และการเข้าเรียน
            </p>
          </div>
          <Link
            href="/sessions"
            className="inline-flex items-center justify-center rounded-lg bg-indigo-600 px-6 py-2.5 text-sm font-medium text-white shadow-md transition-all hover:bg-indigo-700 active:scale-95"
          >
            จัดการช่วงเรียน
          </Link>
        </div>

        {error && (
          <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-5 py-4 text-red-800 shadow-sm">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-6 rounded-xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-emerald-800 shadow-sm">
            {success}
          </div>
        )}

        {!tokens ? (
          <div className="rounded-2xl bg-white p-10 text-center border border-gray-200 shadow-md">
            <h2 className="text-2xl font-semibold text-gray-900">กรุณาเข้าสู่ระบบ</h2>
            <p className="mt-3 text-gray-600">ส่วนจัดการสำหรับ Admin เท่านั้น</p>
            <Link
              href="/"
              className="mt-8 inline-block rounded-lg bg-indigo-600 px-8 py-3.5 font-medium text-white shadow-md transition hover:bg-indigo-700"
            >
              ไปที่หน้าเข้าสู่ระบบ
            </Link>
          </div>
        ) : (
          <>
            {/* Signed in info + controls */}
            <section className="mb-10 rounded-xl bg-white p-6 border border-gray-200 shadow-md">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm text-gray-500">Signed in as</p>
                  <p className="font-medium text-gray-900">{profile?.email}</p>
                  <p className="text-xs uppercase tracking-wide text-gray-700 mt-1">
                    {profile?.role}
                  </p>
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => tokens && void loadInitialData(tokens)}
                    className="rounded-lg border border-gray-300 bg-white px-5 py-2 text-sm text-gray-700 transition hover:bg-gray-50"
                  >
                    Refresh
                  </button>
                  <button
                    onClick={logout}
                    className="rounded-lg border border-red-200 bg-red-50 px-5 py-2 text-sm text-red-700 transition hover:bg-red-100"
                  >
                    Logout
                  </button>
                </div>
              </div>
            </section>

            {/* ── Create User + Create Course ─────────────────────────────── */}
            <section className="mb-12 rounded-2xl bg-white p-6 md:p-8 border border-gray-200 shadow-md">
              <h2 className="mb-7 text-2xl font-semibold text-gray-900">Admin Management</h2>
              <div className="grid gap-8 lg:grid-cols-2">
                {/* Create User */}
                <form
                  onSubmit={createUserByAdmin}
                  className="flex flex-col gap-4 rounded-xl bg-gray-50 p-6 border border-gray-200"
                >
                  <h3 className="text-xl font-medium text-gray-900">Add Student / Teacher</h3>

                  <select
                    value={newUserRole}
                    onChange={(e) => setNewUserRole(e.target.value as "student" | "teacher")}
                    className="h-11 rounded-lg border border-gray-300 bg-white px-4 text-gray-900 outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-600/40"
                  >
                    <option value="student">Student</option>
                    <option value="teacher">Teacher</option>
                  </select>

                  <input
                    value={newUserFullName}
                    onChange={(e) => setNewUserFullName(e.target.value)}
                    placeholder="ชื่อ-นามสกุล"
                    required
                    className="h-11 rounded-lg border border-gray-300 bg-white px-4 text-gray-900 outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-600/40"
                  />

                  <input
                    value={newUserEmail}
                    onChange={(e) => setNewUserEmail(e.target.value)}
                    type="email"
                    placeholder="อีเมล"
                    required
                    className="h-11 rounded-lg border border-gray-300 bg-white px-4 text-gray-900 outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-600/40"
                  />

                  <input
                    value={newUserPassword}
                    onChange={(e) => setNewUserPassword(e.target.value)}
                    type="password"
                    placeholder="รหัสผ่าน"
                    minLength={6}
                    required
                    className="h-11 rounded-lg border border-gray-300 bg-white px-4 text-gray-900 outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-600/40"
                  />

                  {newUserRole === "student" && (
                    <input
                      value={newUserStudentId}
                      onChange={(e) => setNewUserStudentId(e.target.value)}
                      placeholder="รหัสนักศึกษา (ถ้ามี)"
                      className="h-11 rounded-lg border border-gray-300 bg-white px-4 text-gray-900 outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-600/40"
                    />
                  )}

                  <input
                    value={newUserDepartment}
                    onChange={(e) => setNewUserDepartment(e.target.value)}
                    placeholder="คณะ / ภาควิชา"
                    className="h-11 rounded-lg border border-gray-300 bg-white px-4 text-gray-900 outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-600/40"
                  />

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="mt-2 h-12 rounded-lg bg-indigo-600 font-medium text-white shadow-md transition hover:bg-indigo-700 disabled:opacity-60"
                  >
                    สร้างผู้ใช้
                  </button>
                </form>

                {/* Create Course */}
                <form
                  onSubmit={createCourseByAdmin}
                  className="flex flex-col gap-4 rounded-xl bg-gray-50 p-6 border border-gray-200"
                >
                  <h3 className="text-xl font-medium text-gray-900">Add New Course</h3>

                  <input
                    value={newCourseCode}
                    onChange={(e) => setNewCourseCode(e.target.value)}
                    placeholder="รหัสวิชา"
                    required
                    className="h-11 rounded-lg border border-gray-300 bg-white px-4 text-gray-900 outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-600/40"
                  />

                  <input
                    value={newCourseName}
                    onChange={(e) => setNewCourseName(e.target.value)}
                    placeholder="ชื่อวิชา"
                    required
                    className="h-11 rounded-lg border border-gray-300 bg-white px-4 text-gray-900 outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-600/40"
                  />

                  <input
                    value={newCourseDescription}
                    onChange={(e) => setNewCourseDescription(e.target.value)}
                    placeholder="คำอธิบาย (ถ้ามี)"
                    className="h-11 rounded-lg border border-gray-300 bg-white px-4 text-gray-900 outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-600/40"
                  />

                  <select
                    value={newCourseTeacherId}
                    onChange={(e) => setNewCourseTeacherId(e.target.value)}
                    required
                    className="h-11 rounded-lg border border-gray-300 bg-white px-4 text-gray-900 outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-600/40"
                  >
                    <option value="">เลือกอาจารย์ผู้สอน</option>
                    {teacherOptions.map((t) => (
                      <option key={t._id} value={t._id}>
                        {t.fullName} ({t.email})
                      </option>
                    ))}
                  </select>

                  <input
                    value={newCourseDepartment}
                    onChange={(e) => setNewCourseDepartment(e.target.value)}
                    placeholder="คณะ / ภาควิชา"
                    required
                    className="h-11 rounded-lg border border-gray-300 bg-white px-4 text-gray-900 outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-600/40"
                  />

                  <input
                    value={newCourseRoomLocation}
                    onChange={(e) => setNewCourseRoomLocation(e.target.value)}
                    placeholder="ห้องเรียน (เช่น อาคาร A ห้อง 305)"
                    required
                    className="h-11 rounded-lg border border-gray-300 bg-white px-4 text-gray-900 outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-600/40"
                  />

                  <div className="grid grid-cols-2 gap-4">
                    <input
                      value={newCourseSemester}
                      onChange={(e) => setNewCourseSemester(e.target.value)}
                      type="number"
                      min={1}
                      placeholder="ภาคเรียน"
                      required
                      className="h-11 rounded-lg border border-gray-300 bg-white px-4 text-gray-900 outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-600/40"
                    />
                    <input
                      value={newCourseAcademicYear}
                      onChange={(e) => setNewCourseAcademicYear(e.target.value)}
                      type="number"
                      placeholder="ปีการศึกษา"
                      required
                      className="h-11 rounded-lg border border-gray-300 bg-white px-4 text-gray-900 outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-600/40"
                    />
                    <input
                      value={newCourseTotalClasses}
                      onChange={(e) => setNewCourseTotalClasses(e.target.value)}
                      type="number"
                      min={1}
                      placeholder="จำนวนครั้งเรียน"
                      required
                      className="h-11 rounded-lg border border-gray-300 bg-white px-4 text-gray-900 outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-600/40"
                    />
                    <input
                      value={newCourseCredits}
                      onChange={(e) => setNewCourseCredits(e.target.value)}
                      type="number"
                      min={1}
                      step={0.5}
                      placeholder="หน่วยกิต"
                      required
                      className="h-11 rounded-lg border border-gray-300 bg-white px-4 text-gray-900 outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-600/40"
                    />
                  </div>

                  <label className="text-sm text-gray-700">นักศึกษาที่ลงทะเบียน (เลือกได้หลายคน)</label>
                  <select
                    multiple
                    value={newCourseStudentIds}
                    onChange={(e) =>
                      setNewCourseStudentIds(
                        Array.from(e.target.selectedOptions, (opt) => opt.value)
                      )
                    }
                    className="min-h-[140px] rounded-lg border border-gray-300 bg-white p-3 text-gray-900 outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-600/40"
                  >
                    {studentOptions.map((s) => (
                      <option key={s._id} value={s._id}>
                        {s.fullName} {s.studentId ? `(${s.studentId})` : `(${s.email})`}
                      </option>
                    ))}
                  </select>

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="mt-2 h-12 rounded-lg bg-indigo-600 font-medium text-white shadow-md transition hover:bg-indigo-700 disabled:opacity-60"
                  >
                    สร้างรายวิชา
                  </button>
                </form>
              </div>
            </section>

            {/* Course Selector */}
            <section className="mb-10 rounded-2xl bg-white p-6 md:p-8 border border-gray-200 shadow-md">
              <h2 className="mb-5 text-xl font-semibold text-gray-900">เลือกวิชา</h2>
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                <select
                  value={selectedCourseId}
                  onChange={(e) => setSelectedCourseId(e.target.value)}
                  className="h-11 flex-1 rounded-lg border border-gray-300 bg-white px-4 text-gray-900 outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-600/40"
                >
                  <option value="">เลือกวิชา...</option>
                  {courses.map((c) => (
                    <option key={c._id} value={c._id}>
                      {c.courseCode} — {c.courseName}
                    </option>
                  ))}
                </select>

                <button
                  onClick={() => selectedCourseId && void loadAttendanceForCourse(selectedCourseId)}
                  disabled={!selectedCourseId || isLoading}
                  className="h-11 rounded-lg bg-indigo-600 px-6 font-medium text-white transition hover:bg-indigo-700 disabled:opacity-60"
                >
                  โหลดรายชื่อเข้าเรียน
                </button>
              </div>

              {selectedCourse && (
                <p className="mt-4 text-sm text-gray-600">
                  {selectedCourse.courseCode} • ภาคเรียน {selectedCourse.semester ?? "—"} • ปีการศึกษา{" "}
                  {selectedCourse.academicYear ?? "—"} • ห้อง {selectedCourse.roomLocation ?? "—"}
                </p>
              )}
            </section>

            {/* Record Attendance */}
            <section className="mb-10 rounded-2xl bg-white p-6 md:p-8 border border-gray-200 shadow-md">
              <h2 className="mb-5 text-xl font-semibold text-gray-900">บันทึกการเข้าเรียน</h2>

              <form onSubmit={recordAttendance} className="grid gap-4 md:grid-cols-2">
                <input
                  value={studentId}
                  onChange={(e) => setStudentId(e.target.value)}
                  placeholder="รหัสนักศึกษา หรือ ObjectId"
                  required
                  className="h-11 rounded-lg border border-gray-300 bg-white px-4 text-gray-900 outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-600/40"
                />

                <input
                  value={classDate}
                  onChange={(e) => setClassDate(e.target.value)}
                  type="datetime-local"
                  required
                  className="h-11 rounded-lg border border-gray-300 bg-white px-4 text-gray-900 outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-600/40"
                />

                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as AttendanceStatus)}
                  className="h-11 rounded-lg border border-gray-300 bg-white px-4 text-gray-900 outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-600/40"
                >
                  <option value="present">มา</option>
                  <option value="absent">ขาด</option>
                  <option value="late">มาสาย</option>
                  <option value="excused">ลา</option>
                </select>

                <input
                  value={sessionNumber}
                  onChange={(e) => setSessionNumber(e.target.value)}
                  type="number"
                  min={1}
                  placeholder="ครั้งที่ (ถ้ามี)"
                  className="h-11 rounded-lg border border-gray-300 bg-white px-4 text-gray-900 outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-600/40"
                />

                <input
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  placeholder="หมายเหตุ (ถ้ามี)"
                  className="md:col-span-2 h-11 rounded-lg border border-gray-300 bg-white px-4 text-gray-900 outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-600/40"
                />

                <button
                  type="submit"
                  disabled={!selectedCourseId || isLoading}
                  className="md:col-span-2 h-12 rounded-lg bg-indigo-600 font-medium text-white shadow-md transition hover:bg-indigo-700 disabled:opacity-60"
                >
                  บันทึก
                </button>
              </form>
            </section>

            {/* Attendance Table */}
            <section className="rounded-2xl bg-white p-6 md:p-8 border border-gray-200 shadow-md">
              <h2 className="mb-5 text-xl font-semibold text-gray-900">ประวัติการเข้าเรียน</h2>

              {courseAttendance.length === 0 ? (
                <p className="text-gray-600">ยังไม่มีข้อมูล หรือยังไม่ได้เลือกวิชา</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="py-3 pr-4 font-medium text-gray-900">วันที่ / เวลา</th>
                        <th className="py-3 pr-4 font-medium text-gray-900">สถานะ</th>
                        <th className="py-3 pr-4 font-medium text-gray-900">นักศึกษา</th>
                        <th className="py-3 pr-4 font-medium text-gray-900">หมายเหตุ</th>
                      </tr>
                    </thead>
                    <tbody>
                      {courseAttendance.map((rec) => {
                        const studentName =
                          typeof rec.studentId === "string"
                            ? rec.studentId
                            : rec.studentId?.fullName || rec.studentId?._id || "—";

                        return (
                          <tr
                            key={rec._id}
                            className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
                          >
                            <td className="py-3 pr-4">
                              {new Date(rec.classDate).toLocaleString("th-TH")}
                            </td>
                            <td className="py-3 pr-4 capitalize">{rec.status}</td>
                            <td className="py-3 pr-4">{studentName}</td>
                            <td className="py-3 pr-4">{rec.remarks || "—"}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </>
        )}
      </div>
    </main>
  );
}