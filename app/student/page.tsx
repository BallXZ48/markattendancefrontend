"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { GraduationCap, IdCard, School, BookOpen, CheckCircle2, Bell, Clock, MapPin, Activity, Radio, LayoutGrid } from "lucide-react";

// กำหนด KEY ให้ตรงกับหน้า Login
const STORAGE_KEY = "attendance-auth";

export default function StudentPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);

  const profile = {
    fullName: "อัครวุฒิ ชดช้อย",
    studentId: "6704101387",
    major: "วิทยาการคอมพิวเตอร์",
    faculty: "คณะวิทยาศาสตร์",
    email: "6704101387@mju.ac.th"
  };

  const courses = [
    { id: "CS101", name: "Introduction to Computer Science", time: "09:00 - 12:00", room: "CS Building Room 401", isChecking: true },
    { id: "CS102", name: "Programming Fundamentals", time: "13:00 - 16:00", room: "CS Building Lab 1", isChecking: false },
    { id: "CS201", name: "Data Structures and Algorithms", time: "09:00 - 12:00", room: "CS Building Room 402", isChecking: false },
    { id: "CS202", name: "Object-Oriented Programming", time: "13:00 - 16:00", room: "CS Building Lab 2", isChecking: false },
    { id: "CS301", name: "Database Systems", time: "09:00 - 12:00", room: "CS Building Room 403", isChecking: false },
    { id: "CS302", name: "Computer Networks", time: "13:00 - 16:00", room: "CS Building Room 404", isChecking: false }
  ];

  const checkingCourses = courses.filter(c => c.isChecking);
  const otherCourses = courses.filter(c => !c.isChecking);

  // --- ส่วนที่แก้ไข: ฟังก์ชัน Logout ---
  const handleLogout = () => {
    // 1. ลบข้อมูล Auth ออกจาก localStorage เพื่อให้กลับไปหน้า Login จริงๆ
    localStorage.removeItem(STORAGE_KEY);
    // 2. ดีดกลับไปหน้าแรก (หน้า Login)
    router.push("/");
  };

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 800);
    return () => clearTimeout(timer);
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#E2E8F0]">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-[#130f2a] border-t-transparent shadow-xl"></div>
      </div>
    );
  }

  return (
    <main className="min-h-screen text-[#130f2a] pb-24 font-sans relative overflow-hidden bg-[#CBD5E1]">
      
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute top-[-10%] right-[-10%] h-[800px] w-[800px] rounded-full bg-indigo-400/15 blur-[120px] animate-pulse" />
        <div className="absolute bottom-[-5%] left-[-15%] h-[900px] w-[900px] rounded-full bg-blue-400/20 blur-[140px] animate-bounce-slow" />
        <div className="absolute inset-0 opacity-[0.15]" style={{ backgroundImage: `radial-gradient(#130f2a 1.5px, transparent 1px)`, backgroundSize: '32px 32px' }} />
        <svg className="absolute inset-0 w-full h-full opacity-[0.08]" xmlns="http://www.w3.org/2000/svg">
          <pattern id="circuit" width="200" height="200" patternUnits="userSpaceOnUse">
            <path d="M0 100h40m20 0h140M100 0v40m0 20v140M40 100l20-20m0 40l-20-20M100 40l20 20m-40 0l20-20" stroke="#130f2a" strokeWidth="1" fill="none" />
            <circle cx="40" cy="100" r="3" fill="#130f2a" />
            <circle cx="160" cy="100" r="3" fill="#130f2a" />
            <circle cx="100" cy="40" r="3" fill="#130f2a" />
            <circle cx="100" cy="160" r="3" fill="#130f2a" />
          </pattern>
          <rect width="100%" height="100%" fill="url(#circuit)" />
        </svg>
      </div>

      <nav className="sticky top-0 z-50 border-b border-slate-300/50 bg-white/40 backdrop-blur-2xl shadow-sm">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-8 py-5">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#130f2a] text-white shadow-lg">
              <GraduationCap size={24} />
            </div>
            <span className="text-2xl font-black tracking-tighter uppercase">ATTEND.</span>
          </div>
          {/* เรียกใช้ handleLogout */}
          <button 
            onClick={handleLogout} 
            className="rounded-2xl border border-slate-300 bg-white/60 px-6 py-2.5 text-xs font-black transition-all hover:bg-red-50 hover:text-red-600 shadow-sm active:scale-95"
          >
            LOGOUT
          </button>
        </div>
      </nav>

      <div className="mx-auto max-w-7xl px-8 pt-12 relative z-10">
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-12">
          
          <aside className="lg:col-span-4 space-y-8">
            <div className="overflow-hidden rounded-[3rem] bg-white/90 border border-white shadow-[0_20px_50px_rgba(0,0,0,0.1)] backdrop-blur-md">
              <div className="h-32 bg-[#130f2a] relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-white/10 via-transparent to-transparent"></div>
              </div>
              <div className="px-10 pb-12 text-center">
                <div className="relative -mt-16 mb-8 inline-block">
                  <div className="h-32 w-32 rounded-[2.8rem] border-[6px] border-white bg-[#F8FAFC] flex items-center justify-center text-4xl font-black text-[#130f2a] shadow-xl">อว</div>
                </div>
                <div className="space-y-1 mb-10 text-left">
                  <h2 className="text-2xl font-black tracking-tight leading-none">{profile.fullName}</h2>
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-2">{profile.email}</p>
                </div>
                <div className="space-y-4">
                  {[{ label: "Identification ID", val: profile.studentId, icon: IdCard }, { label: "Faculty Name", val: profile.faculty, icon: School }, { label: "Field of Study", val: profile.major, icon: BookOpen }].map((item, i) => (
                    <div key={i} className="flex items-center gap-4 rounded-3xl bg-slate-200/40 p-5 border border-transparent transition-all duration-300">
                      <div className="text-[#130f2a]/80"><item.icon size={20} /></div>
                      <div className="text-left text-[#130f2a]">
                        <p className="text-[9px] font-bold uppercase text-slate-500 tracking-wider mb-0.5">{item.label}</p>
                        <p className="font-bold text-sm leading-tight">{item.val}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="rounded-[3rem] bg-[#130f2a] p-10 text-white shadow-2xl relative overflow-hidden group">
              <div className="flex items-center justify-between mb-8 relative z-10">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Overall Consistency</p>
                <Activity size={18} className="text-indigo-400" />
              </div>
              <div className="flex items-baseline gap-2 relative z-10">
                <p className="text-6xl font-black tracking-tighter">95.4%</p>
                <p className="text-xs font-bold text-green-400 uppercase tracking-widest bg-green-400/10 px-2 py-1 rounded">Excellent</p>
              </div>
              <div className="mt-8 h-2 w-full rounded-full bg-white/10 overflow-hidden relative z-10">
                <div className="h-full w-[95.4%] bg-white"></div>
              </div>
            </div>
          </aside>

          <div className="lg:col-span-8 space-y-10">
            {checkingCourses.length > 0 && (
              <section className="space-y-6">
                <header className="flex items-center gap-3 px-2">
                  <div className="h-3 w-3 rounded-full bg-green-500 animate-ping"></div>
                  <h3 className="text-2xl font-black tracking-tight uppercase text-[#0f172a]">Ongoing Attendance</h3>
                </header>
                <div className="grid grid-cols-1 gap-8 sm:grid-cols-2">
                  {checkingCourses.map((course) => (
                    <div key={course.id} className="group relative rounded-[3.2rem] bg-white border-2 border-green-500 p-10 shadow-[0_0_30px_rgba(34,197,94,0.2)] animate-pulse-scale z-20">
                      <div className="absolute top-6 right-8 flex items-center gap-2 px-3 py-1 rounded-full bg-green-500 text-white text-[10px] font-black animate-bounce">
                        <Radio size={12} className="animate-pulse" />
                        ONGOING
                      </div>
                      <div className="mb-12">
                        <span className="text-[11px] font-black uppercase tracking-widest mb-2 block text-green-600">{course.id}</span>
                        <h4 className="text-2xl font-black leading-tight tracking-tight text-[#130f2a] min-h-[4rem]">{course.name}</h4>
                      </div>
                      <div className="space-y-4 mb-12">
                        <div className="flex items-center gap-3 text-xs font-bold text-slate-500 uppercase tracking-tight">
                          <Clock size={16} className="text-green-500" /> {course.time}
                        </div>
                        <div className="flex items-center gap-3 text-xs font-bold text-slate-500 uppercase tracking-tight">
                          <MapPin size={16} className="text-green-500" /> {course.room}
                        </div>
                      </div>
                      <Link href="/sessions" className="flex items-center justify-center gap-3 rounded-2xl bg-green-600 py-5 text-sm font-black text-white shadow-xl transition-all hover:bg-green-500 active:scale-95 animate-pulse">
                        เข้าเช็กชื่อ
                        <CheckCircle2 size={18} />
                      </Link>
                    </div>
                  ))}
                </div>
              </section>
            )}

            <section className="space-y-6">
              <header className="px-2 pt-4 flex items-center gap-3">
                <LayoutGrid size={20} className="text-slate-500" />
                <h3 className="text-2xl font-black tracking-tight uppercase text-[#0f172a]">Other Courses</h3>
              </header>
              <div className="grid grid-cols-1 gap-8 sm:grid-cols-2">
                {otherCourses.map((course) => (
                  <div key={course.id} className="group relative rounded-[3.2rem] bg-white/70 border border-slate-300/60 p-10 shadow-lg transition-all hover:border-[#130f2a]">
                    <div className="mb-12">
                      <span className="text-[11px] font-black uppercase tracking-widest text-indigo-600 mb-2 block">{course.id}</span>
                      <h4 className="text-2xl font-black leading-tight tracking-tight text-[#130f2a] min-h-[4rem]">{course.name}</h4>
                    </div>
                    <div className="space-y-4 mb-12">
                      <div className="flex items-center gap-3 text-xs font-bold text-slate-500 uppercase tracking-tight">
                        <Clock size={16} className="text-indigo-500" /> {course.time}
                      </div>
                      <div className="flex items-center gap-3 text-xs font-bold text-slate-500 uppercase tracking-tight">
                        <MapPin size={16} className="text-indigo-500" /> {course.room}
                      </div>
                    </div>
                    <button disabled className="w-full flex items-center justify-center gap-3 rounded-2xl bg-slate-200 py-5 text-sm font-black text-slate-400 cursor-not-allowed">
                      ยังไม่เปิดเช็คชื่อ
                    </button>
                  </div>
                ))}
              </div>
            </section>

            <div className="rounded-[3rem] border border-slate-300 bg-white/80 p-12 backdrop-blur-md relative overflow-hidden shadow-lg">
              <div className="relative z-10 flex flex-col md:flex-row items-center gap-8">
                <div className="h-16 w-16 flex items-center justify-center rounded-3xl bg-[#130f2a] text-white shadow-xl animate-pulse">
                   <Bell size={28} />
                </div>
                <div className="flex-1 text-[#130f2a]">
                  <h4 className="font-black text-xl uppercase tracking-tighter mb-2">System Notification</h4>
                  <p className="text-sm font-semibold text-slate-600 leading-relaxed">
                    ข้อมูลรายวิชาอัปเดตล่าสุดสำหรับคุณอัครวุฒิ กรุณาเปิดระบบ GPS บนอุปกรณ์ก่อนเช็กชื่อเพื่อความแม่นยำสูงสุด
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <style jsx global>{`
        @keyframes bounce-slow {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-20px); }
        }
        @keyframes pulse-scale {
          0%, 100% { transform: scale(1); box-shadow: 0 0 20px rgba(34,197,94,0.2); }
          50% { transform: scale(1.02); box-shadow: 0 0 35px rgba(34,197,94,0.35); }
        }
        .animate-bounce-slow { animation: bounce-slow 12s ease-in-out infinite; }
        .animate-pulse-scale { animation: pulse-scale 2s ease-in-out infinite; }
      `}</style>
    </main>
  );
}