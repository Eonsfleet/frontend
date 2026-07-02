"use client";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { loginUser } from "@/lib/api/auth";
import { extractApiError } from "@/lib/utils";
import { useAuthStore } from "@/store/authStore";
import Cookies from "js-cookie";
import Image from "next/image";
import logo from "@/public/images/logo.png";

import {
  Carousel,
  CarouselContent,
  CarouselItem,
} from "@/components/ui/carousel";
import Autoplay from "embla-carousel-autoplay";
import { useRef } from "react";

const schema = z.object({
  email: z.string().email("Valid email required"),
  password: z.string().min(1, "Password required"),
});
type LoginForm = z.infer<typeof schema>;

const CAROUSEL_IMAGES = [
  {
    src: "https://res.cloudinary.com/dmpdiupmf/image/upload/v1747127383/carousel_2_quqtfh.jpg",
    alt: "Fleet command center",
  },
  {
    src: "https://res.cloudinary.com/dmpdiupmf/image/upload/v1747127292/han-chenxu-20qcctvyR1Q-unsplash_lwg4bp.jpg",
    alt: "Electric semi-truck on coastal highway",
  },
  {
    src: "https://res.cloudinary.com/dmpdiupmf/image/upload/v1747127292/gabriel-santos-GBVDilE8yvI-unsplash_gjvioy.jpg",
    alt: "Modern automated warehouse",
  },
];

export default function LoginPage() {
  const router = useRouter();
  const setAuth = useAuthStore((s) => s.setAuth);
  const plugin = useRef(Autoplay({ delay: 6000, stopOnInteraction: false }));

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginForm>({
    resolver: zodResolver(schema),
  });

  const { mutate, isPending } = useMutation({
    mutationFn: loginUser,
    onSuccess: (response) => {
      const payload = response.data;
      const organization = payload.user.relationships?.organization || null;

      setAuth(
        payload.access_token,
        payload.refresh_token,
        payload.user,
        organization,
        payload.expires_at,
      );
      router.push("/dashboard");
    },
    onError: (err: any) => {
      const msg = extractApiError(err, "Invalid credentials");
      toast.error(msg);
    },
  });

  return (
    <div className="flex min-h-screen">
      {/* Left side: Carousel */}
      <div className="hidden lg:block lg:w-1/2 relative bg-slate-950">
        <Carousel
          plugins={[plugin.current]}
          className="w-full h-full"
          opts={{ loop: true }}
          role="region"
          aria-roledescription="carousel"
          aria-label="Fleet showcase"
        >
          <CarouselContent className="h-full" aria-live="off">
            {CAROUSEL_IMAGES.map((image, index) => (
              <CarouselItem
                key={index}
                className="h-full relative flex-[0_0_100%] border-none"
                role="group"
                aria-roledescription="slide"
                aria-label={`Slide ${index + 1} of ${CAROUSEL_IMAGES.length}`}
              >
                <div className="relative w-full h-screen">
                  <Image
                    src={image.src}
                    alt={image.alt}
                    fill
                    className="object-cover opacity-60 mix-blend-overlay"
                    priority={index === 0}
                  />
                  <div className="absolute inset-0 bg-linear-to-t from-slate-950 via-slate-900/40 to-transparent" />
                  <div className="absolute bottom-16 left-16 right-16 text-white text-left">
                    <div className="flex items-center gap-3 mb-6">
                      <Image
                        src={logo}
                        alt="EonsFleet Logo"
                        width={40}
                        height={40}
                      />
                      {/* <div className="h-10 w-10 rounded-xl bg-blue-600 shadow-lg shadow-blue-500/30" />
                      <span className="text-2xl font-bold tracking-tight">
                        EonsFleet
                      </span> */}
                    </div>
                    <h2 className="text-4xl font-bold mb-4 tracking-tight">
                      Modern Fleet Operations
                    </h2>
                    <p className="text-slate-300 text-lg max-w-lg leading-relaxed">
                      End-to-end logistics, real-time tracking, and automated
                      maintenance protocols in one unified, intelligent
                      platform.
                    </p>
                  </div>
                </div>
              </CarouselItem>
            ))}
          </CarouselContent>
        </Carousel>
      </div>

      {/* Right side: Login Form */}
      <div className="flex w-full lg:w-1/2 items-center justify-center bg-white px-8 py-12">
        <div className="w-full max-w-md space-y-8">
          <div className="text-center lg:text-left">
            <div className="lg:hidden flex items-center justify-center gap-2 mb-8">
              <div className="h-8 w-8 rounded-lg bg-blue-600" />
              <span className="text-xl font-bold text-slate-900">
                EonsFleet
              </span>
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900">
              Welcome back
            </h1>
            <p className="text-slate-500 mt-2">
              Sign in to your account to manage your fleet
            </p>
          </div>

          <form onSubmit={handleSubmit((d) => mutate(d))} className="space-y-6">
            <div className="space-y-4">
              <div>
                <label htmlFor="email" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 text-slate-900">
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  {...register("email")}
                  aria-describedby={errors.email ? "email-error" : undefined}
                  aria-invalid={!!errors.email}
                  className="flex h-11 w-full rounded-md border border-slate-300 bg-transparent px-3 py-2 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent mt-1.5 transition-shadow"
                  placeholder="name@company.com"
                />
                {errors.email && (
                  <p id="email-error" role="alert" className="text-xs text-red-500 mt-1.5 font-medium">
                    {errors.email.message}
                  </p>
                )}
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label htmlFor="password" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 text-slate-900">
                    Password
                  </label>
                  <a
                    href="/forgot-password"
                    className="text-sm font-medium text-blue-600 hover:text-blue-500 transition-colors"
                  >
                    Forgot password?
                  </a>
                </div>
                <input
                  id="password"
                  type="password"
                  {...register("password")}
                  aria-describedby={errors.password ? "password-error" : undefined}
                  aria-invalid={!!errors.password}
                  className="flex h-11 w-full rounded-md border border-slate-300 bg-transparent px-3 py-2 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-shadow"
                  placeholder="••••••••"
                />
                {errors.password && (
                  <p id="password-error" role="alert" className="text-xs text-red-500 mt-1.5 font-medium">
                    {errors.password.message}
                  </p>
                )}
              </div>
            </div>

            <button
              type="submit"
              disabled={isPending}
              className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-white transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-blue-600 text-white hover:bg-blue-700 hover:shadow-md hover:shadow-blue-600/20 h-11 w-full"
            >
              {isPending ? "Signing in..." : "Sign In"}
            </button>
          </form>

          <p className="px-8 text-center text-sm text-slate-500">
            By clicking sign in, you agree to our{" "}
            <a
              href="/terms"
              className="underline underline-offset-4 hover:text-slate-900"
            >
              Terms of Service
            </a>{" "}
            and{" "}
            <a
              href="/privacy"
              className="underline underline-offset-4 hover:text-slate-900"
            >
              Privacy Policy
            </a>
            .
          </p>
        </div>
      </div>
    </div>
  );
}
