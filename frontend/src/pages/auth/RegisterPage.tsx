import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Link, useNavigate } from 'react-router-dom'
import { Eye, EyeOff, BookOpen, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from '@/components/ui/use-toast'
import { useRegister } from '@/hooks/useAuth'

const registerSchema = z
  .object({
    name: z.string().min(1, 'نام الزامی است').min(2, 'نام باید حداقل ۲ کاراکتر باشد'),
    email: z.string().min(1, 'ایمیل الزامی است').email('ایمیل معتبر وارد کنید'),
    password: z
      .string()
      .min(8, 'رمز عبور باید حداقل ۸ کاراکتر باشد')
      .regex(/[A-Z]/, 'باید حداقل یک حرف بزرگ داشته باشد')
      .regex(/[0-9]/, 'باید حداقل یک عدد داشته باشد'),
    confirmPassword: z.string().min(1, 'رمزهای عبور مطابقت ندارند'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'رمزهای عبور مطابقت ندارند',
    path: ['confirmPassword'],
  })

type RegisterFormValues = z.infer<typeof registerSchema>

export function RegisterPage() {
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const navigate = useNavigate()
  const register = useRegister()

  const {
    register: registerField,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
  })

  const onSubmit = (data: RegisterFormValues) => {
    register.mutate(
      { name: data.name, email: data.email, password: data.password },
      {
        onSuccess: () => {
          navigate('/vocabulary')
        },
        onError: (error) => {
          toast({
            title: 'ثبت‌نام ناموفق',
            description: error.message ?? 'مشکلی پیش آمد. دوباره تلاش کنید.',
            variant: 'destructive',
          })
        },
      }
    )
  }

  return (
    <div dir="rtl" className="font-persian min-h-screen bg-gradient-to-br from-background via-background to-muted/30 flex items-center justify-center p-4">
      {/* Background decorative blobs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
        <div className="absolute -top-40 -right-40 w-80 h-80 rounded-full bg-primary/5 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 rounded-full bg-primary/5 blur-3xl" />
      </div>

      <div className="relative w-full max-w-md animate-fade-in">
        {/* Card */}
        <div className="bg-card border border-border/50 rounded-2xl shadow-xl shadow-black/5 dark:shadow-black/20 p-8">

          {/* Header */}
          <div className="flex flex-col items-center gap-3 mb-8">
            <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-primary/10 dark:bg-primary/20 ring-1 ring-primary/20">
              <BookOpen className="w-7 h-7 text-primary" strokeWidth={1.75} />
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
                ساخت حساب کاربری جدید
              </span>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">

            {/* Name */}
            <div className="space-y-1.5">
              <Label htmlFor="name" className="text-sm font-medium text-foreground">
                نام کامل
              </Label>
              <Input
                id="name"
                type="text"
                autoComplete="name"
                placeholder="مثلاً: علی محمدی"
                aria-describedby={errors.name ? 'name-error' : undefined}
                aria-invalid={!!errors.name}
                className={[
                  'h-11 transition-all duration-150',
                  'focus-visible:ring-2 focus-visible:ring-primary/70 focus-visible:ring-offset-1',
                  errors.name
                    ? 'border-destructive/70 focus-visible:ring-destructive/50'
                    : 'border-input hover:border-muted-foreground/40',
                ].join(' ')}
                {...registerField('name')}
              />
              {errors.name && (
                <p id="name-error" role="alert" className="text-xs font-medium text-destructive">
                  {errors.name.message}
                </p>
              )}
            </div>

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
                {...registerField('email')}
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
                  autoComplete="new-password"
                  placeholder="حداقل ۸ کاراکتر، ۱ حرف بزرگ، ۱ عدد"
                  aria-describedby={errors.password ? 'password-error' : 'password-hint'}
                  aria-invalid={!!errors.password}
                  className={[
                    'h-11 pl-11 transition-all duration-150',
                    'focus-visible:ring-2 focus-visible:ring-primary/70 focus-visible:ring-offset-1',
                    errors.password
                      ? 'border-destructive/70 focus-visible:ring-destructive/50'
                      : 'border-input hover:border-muted-foreground/40',
                  ].join(' ')}
                  {...registerField('password')}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  className="absolute left-3 top-1/2 -translate-y-1/2 p-0.5 rounded text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-colors duration-150"
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" strokeWidth={1.75} />
                  ) : (
                    <Eye className="w-4 h-4" strokeWidth={1.75} />
                  )}
                </button>
              </div>
              {errors.password ? (
                <p id="password-error" role="alert" className="text-xs font-medium text-destructive">
                  {errors.password.message}
                </p>
              ) : (
                <p id="password-hint" className="text-xs text-muted-foreground">
                  حداقل ۸ کاراکتر با یک حرف بزرگ انگلیسی و یک عدد.
                </p>
              )}
            </div>

            {/* Confirm Password */}
            <div className="space-y-1.5">
              <Label htmlFor="confirmPassword" className="text-sm font-medium text-foreground">
                تکرار رمز عبور
              </Label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  placeholder="رمز عبور را دوباره وارد کنید"
                  aria-describedby={errors.confirmPassword ? 'confirm-password-error' : undefined}
                  aria-invalid={!!errors.confirmPassword}
                  className={[
                    'h-11 pl-11 transition-all duration-150',
                    'focus-visible:ring-2 focus-visible:ring-primary/70 focus-visible:ring-offset-1',
                    errors.confirmPassword
                      ? 'border-destructive/70 focus-visible:ring-destructive/50'
                      : 'border-input hover:border-muted-foreground/40',
                  ].join(' ')}
                  {...registerField('confirmPassword')}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword((prev) => !prev)}
                  aria-label={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
                  className="absolute left-3 top-1/2 -translate-y-1/2 p-0.5 rounded text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-colors duration-150"
                >
                  {showConfirmPassword ? (
                    <EyeOff className="w-4 h-4" strokeWidth={1.75} />
                  ) : (
                    <Eye className="w-4 h-4" strokeWidth={1.75} />
                  )}
                </button>
              </div>
              {errors.confirmPassword && (
                <p id="confirm-password-error" role="alert" className="text-xs font-medium text-destructive">
                  {errors.confirmPassword.message}
                </p>
              )}
            </div>

            {/* Submit */}
            <Button
              type="submit"
              size="lg"
              disabled={register.isPending}
              className="w-full h-11 mt-1 font-semibold text-sm tracking-wide transition-all duration-150"
            >
              {register.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  در حال ثبت‌نام...
                </>
              ) : (
                'ساخت حساب'
              )}
            </Button>
          </form>

          {/* Footer */}
          <p className="mt-6 text-center text-sm text-muted-foreground">
            قبلاً عضو شدید؟{' '}
            <Link
              to="/login"
              className="font-medium text-primary hover:text-primary/80 underline-offset-4 hover:underline transition-colors duration-150"
            >
              ورود به حساب
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
