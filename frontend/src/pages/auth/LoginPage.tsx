import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Link, useNavigate } from 'react-router-dom'
import { Eye, EyeOff, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from '@/components/ui/use-toast'
import { ThemeToggle } from '@/components/layout/ThemeToggle'
import { useLogin } from '@/hooks/useAuth'

const loginSchema = z.object({
  email: z.string().min(1, 'ایمیل الزامی است').email('ایمیل معتبر وارد کنید'),
  password: z.string().min(1, 'رمز عبور الزامی است'),
})

type LoginFormValues = z.infer<typeof loginSchema>

export function LoginPage() {
  const [showPassword, setShowPassword] = useState(false)
  const navigate = useNavigate()
  const login = useLogin()

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
  })

  const onSubmit = (data: LoginFormValues) => {
    login.mutate(data, {
      onSuccess: () => {
        navigate('/vocabulary')
      },
      onError: (error) => {
        toast({
          title: 'ورود ناموفق',
          description: error.message ?? 'ایمیل یا رمز عبور اشتباه است. دوباره تلاش کنید.',
          variant: 'destructive',
        })
      },
    })
  }

  return (
    <div dir="rtl" className="font-persian min-h-screen bg-gradient-to-bl from-background via-background to-muted/30 flex items-center justify-center p-4">
      <ThemeToggle className="fixed left-4 top-4 z-20" />
      {/* Background decorative blobs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
        <div className="absolute -top-40 -left-40 w-80 h-80 rounded-full bg-primary/5 blur-3xl" />
        <div className="absolute -bottom-40 -right-40 w-80 h-80 rounded-full bg-primary/5 blur-3xl" />
      </div>

      <div className="relative w-full max-w-md animate-fade-in">
        {/* Card */}
        <div className="bg-card border border-border/50 rounded-2xl shadow-xl shadow-black/5 dark:shadow-black/20 p-8">

          {/* Header */}
          <div className="flex flex-col items-center gap-3 mb-8">
            <div className="flex items-center justify-center w-14 h-14 overflow-hidden rounded-2xl bg-white ring-1 ring-border shadow-sm">
              <img src="/logo/logo-flow-192.png" alt="وکب فلو" className="h-full w-full object-contain p-1.5" draggable={false} />
            </div>
            <div className="text-center">
              <h1 className="text-2xl font-bold tracking-tight text-foreground">
                پلتفرم یادگیری زبان انگلیسی
              </h1>
              <p className="mt-1 text-sm text-muted-foreground">
                واژگانت را گسترش بده
              </p>
            </div>
          </div>

          {/* Section label divider */}
          <div className="relative mb-7">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border/60" />
            </div>
            <div className="relative flex justify-center">
              <span className="px-3 text-xs font-medium text-muted-foreground bg-card">
                ورود به حساب کاربری
              </span>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">

            {/* Email */}
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-sm font-medium text-foreground">
                آدرس ایمیل
              </Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                placeholder="example@gmail.com"
                aria-describedby={errors.email ? 'email-error' : undefined}
                aria-invalid={!!errors.email}
                className={[
                  'h-11 transition-all duration-150',
                  'focus-visible:ring-2 focus-visible:ring-primary/70 focus-visible:ring-offset-1',
                  errors.email
                    ? 'border-destructive/70 focus-visible:ring-destructive/50'
                    : 'border-input hover:border-muted-foreground/40',
                ].join(' ')}
                {...register('email')}
              />
              {errors.email && (
                <p id="email-error" role="alert" className="text-xs font-medium text-destructive">
                  {errors.email.message}
                </p>
              )}
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-sm font-medium text-foreground">
                رمز عبور
              </Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  placeholder="رمز عبور خود را وارد کنید"
                  aria-describedby={errors.password ? 'password-error' : undefined}
                  aria-invalid={!!errors.password}
                  className={[
                    'h-11 pl-11 transition-all duration-150',
                    'focus-visible:ring-2 focus-visible:ring-primary/70 focus-visible:ring-offset-1',
                    errors.password
                      ? 'border-destructive/70 focus-visible:ring-destructive/50'
                      : 'border-input hover:border-muted-foreground/40',
                  ].join(' ')}
                  {...register('password')}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  aria-label={showPassword ? 'پنهان کردن رمز عبور' : 'نمایش رمز عبور'}
                  className="absolute left-3 top-1/2 -translate-y-1/2 p-0.5 rounded text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-colors duration-150"
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" strokeWidth={1.75} />
                  ) : (
                    <Eye className="w-4 h-4" strokeWidth={1.75} />
                  )}
                </button>
              </div>
              {errors.password && (
                <p id="password-error" role="alert" className="text-xs font-medium text-destructive">
                  {errors.password.message}
                </p>
              )}
            </div>

            {/* Submit */}
            <Button
              type="submit"
              size="lg"
              disabled={login.isPending}
              className="w-full h-11 mt-1 font-semibold text-sm tracking-wide transition-all duration-150"
            >
              {login.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  در حال ورود...
                </>
              ) : (
                'ورود'
              )}
            </Button>
          </form>

          {/* Footer */}
          <p className="mt-6 text-center text-sm text-muted-foreground">
            حساب کاربری ندارید؟{' '}
            <Link
              to="/register"
              className="font-medium text-primary hover:text-primary/80 underline-offset-4 hover:underline transition-colors duration-150"
            >
              ثبت‌نام کنید
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
