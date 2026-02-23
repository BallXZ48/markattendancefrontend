"use client";
import { FormEvent, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

// Swiper imports
import { Swiper, SwiperSlide } from "swiper/react";
import { Autoplay, EffectCoverflow } from "swiper/modules";

// Swiper styles
import "swiper/css";
import "swiper/css/effect-coverflow";
import "swiper/css/autoplay";

type Role = "admin" | "teacher" | "student";
type AuthTokens = {
  access_token: string;
  refresh_token: string;
};
type UserProfile = {
  role: Role;
};

const STORAGE_KEY = "attendance-auth";
const DEFAULT_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:3000";

const introImages = [
  "https://upload.wikimedia.org/wikipedia/th/thumb/b/b7/MJU_LOGO.svg/960px-MJU_LOGO.svg.png",
  "https://scontent-bkk1-2.xx.fbcdn.net/v/t39.30808-6/575109103_1344163787500179_6708382114262446968_n.jpg?_nc_cat=109&ccb=1-7&_nc_sid=7b2446&_nc_ohc=GI1OSE9HJBsQ7kNvwE40-un&_nc_oc=AdmaeNCITI-r8VOPb3Zsvlo350DR0WddN19FqNmJBQogWIXmrQOzFvjwE-Yd_zG2srg&_nc_zt=23&_nc_ht=scontent-bkk1-2.xx&_nc_gid=1qvKADZ4MtX-EiwLno-jyg&oh=00_AfuQ8RKw9yIzhKSncZET5NbrgO7O0o8LiO-ionv962IVMA&oe=69A25584",
  "https://scontent-bkk1-2.xx.fbcdn.net/v/t39.30808-6/518386744_1250124910237401_6339382453182408716_n.jpg?stp=cp6_dst-jpg_tt6&_nc_cat=105&ccb=1-7&_nc_sid=dd6889&_nc_ohc=A8--lFdRbfkQ7kNvwHe80oA&_nc_oc=AdmGLj0545vGpV6cmz5icSoT1S3K4B-R9E_vxP2_BOr_7NjHYn_Bb73_sQkzooM2Mz0&_nc_zt=23&_nc_ht=scontent-bkk1-2.xx&_nc_gid=2N75IEWVC9CgSu7zGyKsUw&oh=00_AftvgGpE3YjINecaCtoWTgCfS-0xW1GiLh2HijhNxcwJNw&oe=69A24C1D",
];

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const goByRole = useCallback(
    (role: Role) => {
      if (role === "admin") router.push("/admin");
      if (role === "teacher") router.push("/teacher");
      if (role === "student") router.push("/student");
    },
    [router]
  );

  useEffect(() => {
    const run = async () => {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      try {
        const parsed = JSON.parse(raw) as { tokens: AuthTokens };
        if (!parsed.tokens?.access_token) return;
        const profileRes = await fetch(`${DEFAULT_BASE_URL}/auth/profile`, {
          headers: { Authorization: `Bearer ${parsed.tokens.access_token}` },
        });
        if (!profileRes.ok) return;
        const me = (await profileRes.json()) as UserProfile;
        goByRole(me.role);
      } catch {
        localStorage.removeItem(STORAGE_KEY);
      }
    };
    void run();
  }, [goByRole]);

  const handleSignIn = async (event: FormEvent) => {
    event.preventDefault();
    setError("");
    setIsLoading(true);
    try {
      const signInRes = await fetch(`${DEFAULT_BASE_URL}/auth/signin`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const signInData = await signInRes.json();
      if (!signInRes.ok) {
        throw new Error(signInData.message || "อีเมลหรือรหัสผ่านไม่ถูกต้อง");
      }
      const tokens = signInData as AuthTokens;
      const profileRes = await fetch(`${DEFAULT_BASE_URL}/auth/profile`, {
        headers: { Authorization: `Bearer ${tokens.access_token}` },
      });
      if (!profileRes.ok) {
        throw new Error("ไม่สามารถโหลดข้อมูลผู้ใช้ได้");
      }
      const me = (await profileRes.json()) as UserProfile;
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ tokens }));
      goByRole(me.role);
    } catch (err) {
      setError(err instanceof Error ? err.message : "การเข้าสู่ระบบล้มเหลว");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-[#0f081f] via-[#140f2e] to-[#0a0518] text-white relative overflow-hidden">
      {/* Background glows */}
      <div className="absolute top-[-10%] left-[10%] w-[500px] h-[500px] bg-indigo-700/10 rounded-full filter blur-3xl opacity-40 animate-pulse-slow"></div>
      <div className="absolute bottom-[-10%] right-[10%] w-[500px] h-[500px] bg-purple-700/10 rounded-full filter blur-3xl opacity-40 animate-pulse-slow delay-3000"></div>

      {/* Watermark */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-[0.04]">
        <span className="text-[12rem] md:text-[15rem] font-black text-white/80 select-none transform -rotate-45 tracking-widest">MKADT</span>
      </div>

      <div className="mx-auto max-w-7xl px-6 py-12 md:px-12 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-10 items-center">
          {/* Left: Professional Image Slider */}
          <div className="lg:col-span-2 hidden lg:block">
            <div className="relative rounded-3xl overflow-hidden border border-white/10 bg-black/20 backdrop-blur-xl shadow-2xl shadow-indigo-950/40">
              <Swiper
                modules={[Autoplay, EffectCoverflow]}
                effect="coverflow"
                coverflowEffect={{
                  rotate: 25,
                  stretch: 0,
                  depth: 280,
                  modifier: 1.3,
                  slideShadows: true,
                }}
                grabCursor={true}
                centeredSlides={true}
                slidesPerView={1}
                loop={true}
                autoplay={{
                  delay: 3000,
                  disableOnInteraction: false,
                }}
                speed={1200}
                className="aspect-[4/5] w-full"
              >
                {introImages.map((imgSrc, index) => (
                  <SwiperSlide key={index}>
                    <div className="relative h-full w-full">
                      <img
                        src={imgSrc}
                        alt={`Feature ${index + 1}`}
                        className="absolute inset-0 w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
                      <div className="absolute inset-0 flex items-end p-10">
                        <div className="text-left">
                          <h4 className="text-2xl font-bold text-white drop-shadow-md">
                            {["มหาวิทยาลัยแม่โจ้","รับสมัครนักศึกษาใหม่ประจำปีการศึกษา 2569" , "กิจกรรมแนะแนวให้ความรู้นักศึกษาวิทยาการคอมพิวเตอร์"][index]}
                          </h4>
                          <p className="text-indigo-200 mt-2 text-lg drop-shadow">
                            เข้าสู่ระบบเพื่อเริ่มต้นใช้งาน
                          </p>
                        </div>
                      </div>
                    </div>
                  </SwiperSlide>
                ))}
              </Swiper>
            </div>
          </div>

          {/* Right: Login Form */}
          <div className="lg:col-span-3">
            <div className="rounded-3xl border border-white/10 bg-white/5 backdrop-blur-2xl shadow-2xl shadow-purple-950/30 p-8 md:p-12">
              <div className="max-w-md mx-auto">
                <h2 className="text-4xl font-bold mb-2">เข้าสู่ระบบ</h2>
                <p className="text-gray-400 mb-10">ยินดีต้อนรับกลับมา กรุณากรอกข้อมูลเพื่อดำเนินการต่อ</p>

                {error && (
                  <div className="mb-8 p-4 rounded-2xl bg-red-950/40 border border-red-500/30 text-red-300 text-sm">
                    {error}
                  </div>
                )}

                <form onSubmit={handleSignIn} className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">อีเมล</label>
                    <input
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      type="email"
                      required
                      className="w-full rounded-xl bg-white/10 border border-white/20 px-5 py-4 text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30 transition-all"
                      placeholder="example@school.ac.th"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">รหัสผ่าน</label>
                    <input
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      type="password"
                      required
                      minLength={6}
                      className="w-full rounded-xl bg-white/10 border border-white/20 px-5 py-4 text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30 transition-all"
                      placeholder="••••••••"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 py-4 text-lg font-semibold text-white hover:from-indigo-700 hover:to-purple-700 disabled:opacity-50 transition-all duration-300 shadow-lg hover:shadow-indigo-500/30 active:scale-[0.98]"
                  >
                    {isLoading ? (
                      <span className="flex items-center justify-center gap-3">
                        <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        กำลังเข้าสู่ระบบ...
                      </span>
                    ) : (
                      "เข้าสู่ระบบ"
                    )}
                  </button>
                </form>

                {/* ส่วนล่างที่แก้ไขเป็นลืมรหัสผ่าน */}
                <div className="mt-10 text-center text-sm text-gray-400">
                  <p>มีปัญหาในการเข้าสู่ระบบ?</p>
                  <Link href="/forgot-password" className="text-indigo-400 hover:text-indigo-300 font-medium transition-colors">
                    ลืมรหัสผ่านใช่หรือไม่?
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}