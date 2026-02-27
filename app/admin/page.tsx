"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Users,
  BookOpen,
  Plus,
  RefreshCcw,
  LogOut,
  ClipboardCheck,
  Settings,
  GraduationCap,
  UserPlus,
  Layout,
  CheckCircle2,
  AlertCircle,
  Search,
  School,
  IdCard,
  Mail,
  Lock,
  MapPin,
  Compass,
  ChevronRight
} from "lucide-react";

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
  facultyName?: string;
};

type Course = {
  _id: string;
  courseCode: string;
  courseName: string;
  description?: string;
  teacherId?: string | UserRef;
  studentIds?: Array<string | UserRef>;
  semester?: number;
  academicYear?: number;
  roomLocation?: string;
  isActive?: boolean;
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
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [teacherOptions, setTeacherOptions] = useState<UserRef[]>([]);
  const [studentOptions, setStudentOptions] = useState<UserRef[]>([]);

  // ── Create User Form State (Updated for Faculty) ──────────────────
  const [newUserRole, setNewUserRole] = useState<"student" | "teacher">("student");
  const [newUserEmail, setNewUserEmail] = useState("");
  const [newUserPassword, setNewUserPassword] = useState("");
  const [newUserFullName, setNewUserFullName] = useState("");
  const [newUserStudentId, setNewUserStudentId] = useState("");
  const [newUserDepartment, setNewUserDepartment] = useState("");
  const [newUserFaculty, setNewUserFaculty] = useState("");
  const [newUserTableId, setNewUserTableId] = useState(""); // For students (1-10)
  const [newUserTeachingTableId, setNewUserTeachingTableId] = useState(""); // For teachers

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
  const [newCourseIsActive, setNewCourseIsActive] = useState(true);
  const [newCourseLatitude, setNewCourseLatitude] = useState("");
  const [newCourseLongitude, setNewCourseLongitude] = useState("");


  useEffect(() => {
    if (!newCourseTeacherId && teacherOptions.length > 0) {
      setNewCourseTeacherId(teacherOptions[0]._id ?? "");
    }
  }, [teacherOptions, newCourseTeacherId]);

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
    } catch { /* silent fail */ }
    localStorage.removeItem(STORAGE_KEY);
    setTokens(null);
    setProfile(null);
    setCourses([]);
    router.push("/");
  }, [tokens, baseUrl, router, resetNotice]);

  const refreshAccessToken = async (refreshToken: string): Promise<AuthTokens> => {
    const res = await fetch(`${baseUrl}/auth/refresh`, {
      method: "POST",
      headers: { Authorization: `Bearer ${refreshToken}` },
    });
    if (!res.ok) throw new Error("เซสชันหมดอายุ กรุณาเข้าสู่ระบบอีกครั้ง");
    return res.json();
  };

  const callWithAuth = useCallback(
    async (path: string, init: RequestInit = {}): Promise<Response> => {
      if (!tokens) throw new Error("กรุณาเข้าสู่ระบบก่อน");
      let res = await fetch(`${baseUrl}${path}`, {
        ...init,
        headers: {
          "Content-Type": "application/json",
          ...init.headers,
          Authorization: `Bearer ${tokens.access_token}`,
        },
      });
      if (res.status !== 401) return res;
      const newTokens = await refreshAccessToken(tokens.refresh_token);
      setTokens(newTokens);
      res = await fetch(`${baseUrl}${path}`, {
        ...init,
        headers: {
          "Content-Type": "application/json",
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
        if (!profileRes.ok) throw new Error("ไม่สามารถโหลดข้อมูลโปรไฟล์ได้");
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
        if (!coursesRes.ok) throw new Error("ไม่สามารถโหลดวิชาเรียนได้");
        const allCourses = (await coursesRes.json()) as Course[];
        setCourses(allCourses);
        if (teachersRes.ok) setTeacherOptions(await teachersRes.json());
        if (studentsRes.ok) setStudentOptions(await studentsRes.json());
      } catch (err: any) {
        const msg = err.message || "การเริ่มต้นระบบล้มเหลว";
        setError(msg);
        if (msg.toLowerCase().includes("session") || msg.includes("เซสชัน")) {
          localStorage.removeItem(STORAGE_KEY);
          setTokens(null);
          router.push("/");
        }
      } finally {
        setIsLoading(false);
      }
    },
    [baseUrl, router, resetNotice]
  );

  useEffect(() => {
    if (!tokens) {
      setProfile(null);
      setCourses([]);
      return;
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ tokens }));
    void loadInitialData(tokens);
  }, [tokens, loadInitialData]);


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
        facultyName: newUserFaculty, // Added Faculty
        isActive: true
      };
      if (newUserRole === "student") {
        if (newUserStudentId.trim()) payload.studentId = newUserStudentId.trim();
        if (newUserTableId) payload.tableId = Number(newUserTableId);
      }
      if (newUserRole === "teacher" && newUserTeachingTableId) {
        payload.tableId = Number(newUserTeachingTableId);
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
      setNewUserFaculty("");
      setNewUserTableId("");
      setNewUserTeachingTableId("");
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
          latitude: newCourseLatitude ? Number(newCourseLatitude) : undefined,
          longitude: newCourseLongitude ? Number(newCourseLongitude) : undefined,
          studentIds: newCourseStudentIds.length ? newCourseStudentIds : undefined,
          isActive: newCourseIsActive,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || "สร้างรายวิชาไม่สำเร็จ");
      }
      setSuccess("สร้างรายวิชาสำเร็จ");
      setNewCourseCode("");
      setNewCourseName("");
      setNewCourseDescription("");
      setNewCourseRoomLocation("");
      setNewCourseLatitude("");
      setNewCourseLongitude("");
      setNewCourseStudentIds([]);
      setNewCourseIsActive(true);
      const coursesRes = await callWithAuth("/courses");
      if (coursesRes.ok) setCourses(await coursesRes.json());
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="min-h-screen text-[#130f2a] font-sans relative overflow-hidden bg-[#CBD5E1] flex flex-col">
      {/* Background decoration */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-400/20 blur-[120px] rounded-full z-0"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-indigo-400/20 blur-[120px] rounded-full z-0"></div>

      <nav className="z-50 border-b border-white/20 bg-white/40 backdrop-blur-xl shrink-0">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-white shadow-lg shadow-blue-600/20">
              <ClipboardCheck size={22} fill="currentColor" className="fill-white/20" />
            </div>
            <span className="text-xl font-black tracking-tighter uppercase">ระบบจัดการ<span className="text-blue-500">.</span>ผู้ดูแล</span>
          </div>
          <div className="flex items-center gap-4">
            {tokens && (
              <div className="hidden md:flex flex-col items-end mr-2">
                <span className="text-[10px] font-black uppercase text-slate-500 tracking-wider">เซสชันที่ใช้งานอยู่</span>
                <span className="text-xs font-bold text-slate-800">{profile?.email}</span>
              </div>
            )}
          </div>
        </div>
      </nav>

      <div className="flex-1 overflow-y-auto px-6 py-8 relative z-10 custom-scrollbar">
        <div className="mx-auto max-w-7xl">

          <div className="flex flex-col md:flex-row md:items-end justify-between mb-10 gap-6">
            <div>
              <div className="flex items-center gap-2 text-blue-600 mb-1 font-black text-[10px] uppercase tracking-[0.3em]">
                <Settings size={16} /> แผงควบคุมการจัดการ
              </div>
              <h1 className="text-4xl font-black tracking-tight uppercase text-[#0f172a] leading-none">
                ผู้ดูแลระบบ
              </h1>
            </div>
            {tokens && (
              <div className="flex items-center gap-3">
                <button
                  onClick={() => void loadInitialData(tokens)}
                  disabled={isLoading}
                  className="p-2.5 rounded-2xl bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 transition-all shadow-sm active:scale-95 disabled:opacity-50"
                  title="รีเฟรชข้อมูล"
                >
                  <RefreshCcw size={20} className={isLoading ? "animate-spin" : ""} />
                </button>
                <button
                  onClick={logout}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-red-500 text-white font-black text-[11px] uppercase hover:bg-red-600 transition-all shadow-lg shadow-red-500/20 active:scale-95"
                >
                  <LogOut size={16} /> ออกจากระบบ
                </button>
              </div>
            )}
          </div>

          {error && (
            <div className="mb-8 p-4 rounded-[1.5rem] bg-red-50 border border-red-100 flex items-center gap-3 text-red-600 animate-in fade-in slide-in-from-top-4 duration-300">
              <AlertCircle size={20} className="shrink-0" />
              <p className="text-sm font-bold uppercase tracking-tight">{error}</p>
            </div>
          )}

          {success && (
            <div className="mb-8 p-4 rounded-[1.5rem] bg-green-50 border border-green-100 flex items-center gap-3 text-green-600 animate-in fade-in slide-in-from-top-4 duration-300">
              <CheckCircle2 size={20} className="shrink-0" />
              <p className="text-sm font-bold uppercase tracking-tight">{success}</p>
            </div>
          )}

          {!tokens ? (
            <div className="py-20 flex flex-col items-center justify-center">
              <div className="bg-white/40 backdrop-blur-xl border border-white/60 p-12 rounded-[3rem] shadow-2xl max-w-md w-full text-center">
                <div className="h-20 w-20 bg-blue-600 rounded-[2rem] flex items-center justify-center text-white mx-auto mb-6 shadow-xl shadow-blue-600/20">
                  <Lock size={36} />
                </div>
                <h2 className="text-2xl font-black text-[#130f2a] uppercase tracking-tight mb-2">การเข้าถึงถูกจำกัด</h2>
                <p className="text-slate-500 font-bold mb-8">กรุณายืนยันตัวตนเพื่อเข้าสู่ระบบจัดการสำหรับผู้ดูแล</p>
                <Link
                  href="/"
                  className="w-full inline-flex items-center justify-center rounded-2xl bg-[#130f2a] px-8 py-4 font-black text-[12px] text-white uppercase tracking-widest shadow-xl transition hover:bg-black active:scale-95"
                >
                  กลับสู่หน้าหลัก
                </Link>
              </div>
            </div>
          ) : (
            <div className="grid gap-8 lg:grid-cols-2">

              {/* --- User Management Card --- */}
              <div className="rounded-[2.5rem] border border-white bg-white/60 backdrop-blur-xl shadow-xl overflow-hidden flex flex-col group transition-all duration-500 hover:shadow-2xl hover:bg-white/80">
                <div className="p-8 pb-4">
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                      <div className="h-12 w-12 rounded-2xl bg-indigo-500 text-white flex items-center justify-center shadow-lg shadow-indigo-500/20">
                        <UserPlus size={24} />
                      </div>
                      <div>
                        <h3 className="text-xl font-black text-[#130f2a] uppercase tracking-tight">การจัดการข้อมูลผู้ใช้</h3>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">เพิ่มนักศึกษาและอาจารย์</p>
                      </div>
                    </div>
                    <div className="bg-indigo-50 px-3 py-1.5 rounded-full">
                      <span className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">การยืนยันตัวตน</span>
                    </div>
                  </div>

                  <form onSubmit={createUserByAdmin} className="space-y-4">
                    <div className="flex p-1.5 bg-slate-100/50 rounded-2xl gap-1">
                      <button
                        type="button"
                        onClick={() => setNewUserRole("student")}
                        className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl font-black text-[10px] uppercase transition-all ${newUserRole === 'student' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                      >
                        <GraduationCap size={16} /> นักศึกษา
                      </button>
                      <button
                        type="button"
                        onClick={() => setNewUserRole("teacher")}
                        className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl font-black text-[10px] uppercase transition-all ${newUserRole === 'teacher' ? 'bg-white text-orange-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                      >
                        <School size={16} /> อาจารย์
                      </button>
                    </div>

                    <div className="space-y-3">
                      <div className="relative group/field">
                        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                          <IdCard size={18} />
                        </div>
                        <input
                          value={newUserFullName}
                          onChange={(e) => setNewUserFullName(e.target.value)}
                          placeholder="ชื่อ-นามสกุล (เช่น นายสมชาย สมบัติ)"
                          required
                          className="w-full h-12 rounded-2xl bg-white border border-slate-200 pl-11 pr-4 text-[11px] font-black uppercase tracking-wider outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/5 transition-all"
                        />
                      </div>

                      <div className="relative group/field">
                        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                          <Mail size={18} />
                        </div>
                        <input
                          value={newUserEmail}
                          onChange={(e) => setNewUserEmail(e.target.value)}
                          type="email"
                          placeholder="ที่อยู่อีเมล"
                          required
                          className="w-full h-12 rounded-2xl bg-white border border-slate-200 pl-11 pr-4 text-[11px] font-black uppercase tracking-wider outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/5 transition-all"
                        />
                      </div>

                      <div className="relative group/field">
                        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                          <Lock size={18} />
                        </div>
                        <input
                          value={newUserPassword}
                          onChange={(e) => setNewUserPassword(e.target.value)}
                          type="password"
                          placeholder="รหัสผ่านความปลอดภัย"
                          minLength={6}
                          required
                          className="w-full h-12 rounded-2xl bg-white border border-slate-200 pl-11 pr-4 text-[11px] font-black uppercase tracking-wider outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/5 transition-all"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <input
                          value={newUserFaculty}
                          onChange={(e) => setNewUserFaculty(e.target.value)}
                          placeholder="คณะ"
                          className="w-full h-12 rounded-2xl bg-white border border-slate-200 px-4 text-[11px] font-black uppercase tracking-wider outline-none focus:border-indigo-500 transition-all"
                        />
                        <input
                          value={newUserDepartment}
                          onChange={(e) => setNewUserDepartment(e.target.value)}
                          placeholder="สาขา"
                          className="w-full h-12 rounded-2xl bg-white border border-slate-200 px-4 text-[11px] font-black uppercase tracking-wider outline-none focus:border-indigo-500 transition-all"
                        />
                      </div>
                    </div>

                    {newUserRole === "student" && (
                      <div className="p-5 rounded-[2rem] bg-indigo-50 border border-indigo-100 space-y-4">
                        <div className="flex items-center gap-2">
                          <div className="h-6 w-1 bg-indigo-500 rounded-full"></div>
                          <span className="text-[10px] font-black text-indigo-600 uppercase tracking-[0.2em]">รายละเอียดนักศึกษา</span>
                        </div>
                        <input
                          value={newUserStudentId}
                          onChange={(e) => setNewUserStudentId(e.target.value)}
                          placeholder="รหัสนักศึกษา (เช่น 6704101343)"
                          className="w-full h-11 rounded-xl bg-white border border-indigo-200 px-4 text-[11px] font-black uppercase tracking-wider outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all"
                        />
                        <div className="space-y-2">
                          <label className="block text-[9px] font-black text-indigo-400 uppercase tracking-widest pl-1">ลำดับหมายเลขโต๊ะ (S-Session)</label>
                          <div className="grid grid-cols-5 gap-1.5">
                            {[...Array(10)].map((_, i) => {
                              const val = String(i + 1);
                              const isSelected = newUserTableId === val;
                              return (
                                <button
                                  key={val}
                                  type="button"
                                  onClick={() => setNewUserTableId(isSelected ? "" : val)}
                                  className={`h-10 rounded-xl font-black text-[11px] transition-all ${isSelected ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20' : 'bg-white text-slate-400 border border-indigo-100 hover:bg-white hover:text-indigo-500'}`}
                                >
                                  {val}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    )}

                    {newUserRole === "teacher" && (
                      <div className="p-5 rounded-[2rem] bg-orange-50 border border-orange-100 space-y-4">
                        <div className="flex items-center gap-2">
                          <div className="h-6 w-1 bg-orange-500 rounded-full"></div>
                          <span className="text-[10px] font-black text-orange-600 uppercase tracking-[0.2em]">ลำดับหมายเลขโต๊ะ (T-Session)</span>
                        </div>
                        <div className="grid grid-cols-5 gap-1.5">
                          {[...Array(10)].map((_, i) => {
                            const val = String(i + 1);
                            const isSelected = newUserTeachingTableId === val;
                            return (
                              <button
                                key={val}
                                type="button"
                                onClick={() => setNewUserTeachingTableId(isSelected ? "" : val)}
                                className={`h-10 rounded-xl font-black text-[11px] transition-all ${isSelected ? 'bg-orange-600 text-white shadow-lg shadow-orange-600/20' : 'bg-white text-slate-400 border border-orange-100 hover:bg-white hover:text-orange-500'}`}
                              >
                                {val}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    <button
                      type="submit"
                      disabled={isLoading}
                      className="w-full py-4 rounded-2xl bg-indigo-600 text-white font-black text-[12px] uppercase tracking-widest transition-all shadow-xl shadow-indigo-600/20 hover:bg-indigo-700 active:scale-95 disabled:opacity-50 mt-4 flex items-center justify-center gap-2"
                    >
                      {isLoading ? <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : <><Users size={18} /> สร้างบัญชีผู้ใช้งาน</>}
                    </button>
                  </form>
                </div>
              </div>

              {/* --- Course Management Card --- */}
              <div className="rounded-[2.5rem] border border-white bg-white/60 backdrop-blur-xl shadow-xl overflow-hidden flex flex-col group transition-all duration-500 hover:shadow-2xl hover:bg-white/80">
                <div className="p-8 pb-4">
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                      <div className="h-12 w-12 rounded-2xl bg-blue-500 text-white flex items-center justify-center shadow-lg shadow-blue-500/20">
                        <BookOpen size={24} />
                      </div>
                      <div>
                        <h3 className="text-xl font-black text-[#130f2a] uppercase tracking-tight">การออกแบบหลักสูตร</h3>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">เพิ่มข้อมูลรายวิชาใหม่</p>
                      </div>
                    </div>
                    <div className="bg-blue-50 px-3 py-1.5 rounded-full">
                      <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest">แค็ตตาล็อก</span>
                    </div>
                  </div>

                  <form onSubmit={createCourseByAdmin} className="space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="relative group/field col-span-1">
                        <input
                          value={newCourseCode}
                          onChange={(e) => setNewCourseCode(e.target.value)}
                          placeholder="CS101"
                          className="w-full h-12 rounded-2xl bg-white border border-slate-200 px-4 text-[11px] font-black uppercase tracking-wider outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/5 transition-all"
                        />
                        <span className="absolute -top-2 left-4 px-1 bg-white text-[8px] font-black text-slate-400 uppercase tracking-widest">รหัสวิชา</span>
                      </div>
                      <div className="relative group/field col-span-1">
                        <input
                          value={newCourseName}
                          onChange={(e) => setNewCourseName(e.target.value)}
                          placeholder="ชื่อวิชา"
                          required
                          className="w-full h-12 rounded-2xl bg-white border border-slate-200 px-4 text-[11px] font-black uppercase tracking-wider outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/5 transition-all"
                        />
                        <span className="absolute -top-2 left-4 px-1 bg-white text-[8px] font-black text-slate-400 uppercase tracking-widest">ชื่อ</span>
                      </div>
                    </div>

                    <div className="relative group/field">
                      <textarea
                        value={newCourseDescription}
                        onChange={(e) => setNewCourseDescription(e.target.value)}
                        placeholder="คำอธิบายรายวิชา (เช่น แนวคิดพื้นฐานของ OOP...)"
                        className="w-full h-24 rounded-2xl bg-white border border-slate-200 p-4 text-[11px] font-black uppercase tracking-wider outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/5 transition-all resize-none"
                      />
                      <span className="absolute -top-2 left-4 px-1 bg-white text-[8px] font-black text-slate-400 uppercase tracking-widest">คำอธิบาย</span>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="relative group/field col-span-1">
                        <select
                          value={newCourseTeacherId}
                          onChange={(e) => setNewCourseTeacherId(e.target.value)}
                          required
                          className="w-full h-12 rounded-2xl bg-white border border-slate-200 px-4 text-[11px] font-black uppercase tracking-wider outline-none focus:border-blue-500 appearance-none transition-all"
                        >
                          <option value="">มอบหมายอาจารย์</option>
                          {teacherOptions.map((t) => (
                            <option key={t._id} value={t._id}>
                              {t.fullName} ({t.email})
                            </option>
                          ))}
                        </select>
                        <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                          <ChevronRight size={16} className="rotate-90" />
                        </div>
                        <span className="absolute -top-2 left-4 px-1 bg-white text-[8px] font-black text-slate-400 uppercase tracking-widest">อาจารย์</span>
                      </div>
                      <div className="relative group/field col-span-1">
                        <select
                          value={newCourseIsActive ? "true" : "false"}
                          onChange={(e) => setNewCourseIsActive(e.target.value === "true")}
                          className="w-full h-12 rounded-2xl bg-white border border-slate-200 px-4 text-[11px] font-black uppercase tracking-wider outline-none focus:border-blue-500 appearance-none transition-all"
                        >
                          <option value="true">ใช้งาน</option>
                          <option value="false">ไม่ใช้งาน</option>
                        </select>
                        <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                          <ChevronRight size={16} className="rotate-90" />
                        </div>
                        <span className="absolute -top-2 left-4 px-1 bg-white text-[8px] font-black text-slate-400 uppercase tracking-widest">สถานะ</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <input
                        value={newCourseDepartment}
                        onChange={(e) => setNewCourseDepartment(e.target.value)}
                        placeholder="สาขา"
                        required
                        className="w-full h-12 rounded-2xl bg-white border border-slate-200 px-4 text-[11px] font-black uppercase tracking-wider outline-none focus:border-blue-500 transition-all"
                      />
                      <input
                        value={newCourseRoomLocation}
                        onChange={(e) => setNewCourseRoomLocation(e.target.value)}
                        placeholder="สถานที่เรียน / ห้องเรียน"
                        required
                        className="w-full h-12 rounded-2xl bg-white border border-slate-200 px-4 text-[11px] font-black uppercase tracking-wider outline-none focus:border-blue-500 transition-all"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="relative group/field">
                        <input
                          value={newCourseLatitude}
                          onChange={(e) => setNewCourseLatitude(e.target.value)}
                          placeholder="ละติจูด (เช่น 18.892)"
                          className="w-full h-12 rounded-2xl bg-white border border-slate-200 pl-10 pr-4 text-[11px] font-black uppercase tracking-wider outline-none focus:border-blue-500 transition-all"
                        />
                        <MapPin size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                      </div>
                      <div className="relative group/field">
                        <input
                          value={newCourseLongitude}
                          onChange={(e) => setNewCourseLongitude(e.target.value)}
                          placeholder="ลองติจูด (เช่น 99.015)"
                          className="w-full h-12 rounded-2xl bg-white border border-slate-200 pl-10 pr-4 text-[11px] font-black uppercase tracking-wider outline-none focus:border-blue-500 transition-all"
                        />
                        <Compass size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                      </div>
                    </div>

                    <div className="grid grid-cols-4 gap-2 bg-slate-100/30 p-4 rounded-[2rem] border border-white/40">
                      {[
                        { label: 'เทอม', value: newCourseSemester, setter: setNewCourseSemester, min: 1 },
                        { label: 'ปีการศึกษา', value: newCourseAcademicYear, setter: setNewCourseAcademicYear },
                        { label: 'จำนวนคาบ', value: newCourseTotalClasses, setter: setNewCourseTotalClasses, min: 1 },
                        { label: 'หน่วยกิต', value: newCourseCredits, setter: setNewCourseCredits, min: 1, step: 0.5 },
                      ].map((field, idx) => (
                        <div key={idx} className="space-y-1.5 text-center">
                          <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest">{field.label}</label>
                          <input
                            type="number"
                            value={field.value}
                            onChange={(e) => field.setter(e.target.value)}
                            min={field.min}
                            step={field.step}
                            required
                            className="w-full h-10 rounded-xl bg-white border border-slate-200 text-center text-[11px] font-black outline-none focus:border-blue-500 transition-all"
                          />
                        </div>
                      ))}
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between pl-1">
                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">นักศึกษาที่ลงทะเบียน</label>
                        <span className="text-[10px] font-black text-blue-500">เลือกแล้ว {newCourseStudentIds.length} คน</span>
                      </div>
                      <div className="relative">
                        <select
                          multiple
                          value={newCourseStudentIds}
                          onChange={(e) => setNewCourseStudentIds(Array.from(e.target.selectedOptions, (opt) => opt.value))}
                          className="w-full min-h-[120px] rounded-[1.5rem] bg-white border border-slate-200 p-3 text-[10px] font-bold uppercase tracking-wider outline-none focus:border-blue-500 transition-all custom-scrollbar overflow-y-auto"
                        >
                          {studentOptions.length === 0 ? (
                            <option disabled>ไม่มีนักศึกษาที่ลงทะเบียน</option>
                          ) : (
                            studentOptions.map((s) => (
                              <option key={s._id} value={s._id} className="p-2.5 rounded-lg mb-1 hover:bg-blue-50 checked:bg-blue-100 checked:text-blue-700 cursor-pointer">
                                {s.fullName} {s.studentId ? `— ${s.studentId}` : `(${s.email})`}
                              </option>
                            ))
                          )}
                        </select>
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={isLoading}
                      className="w-full py-4 rounded-2xl bg-blue-600 text-white font-black text-[12px] uppercase tracking-widest transition-all shadow-xl shadow-blue-600/20 hover:bg-blue-700 active:scale-95 disabled:opacity-50 mt-4 flex items-center justify-center gap-2"
                    >
                      {isLoading ? <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : <><Plus size={18} /> เริ่มต้นรายวิชา</>}
                    </button>
                  </form>
                </div>
              </div>

            </div>
          )}
        </div>
      </div>

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #94a3b8; border-radius: 10px; }
        
        /* Premium select styling */
        select[multiple] option:checked {
          background-color: #dbeafe !important;
          color: #1d4ed8 !important;
        }
      `}</style>
    </main>
  );
}