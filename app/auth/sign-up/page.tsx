"use client"

import { SelectItem } from "@/components/ui/select"

import { SelectContent } from "@/components/ui/select"

import { SelectValue } from "@/components/ui/select"

import { SelectTrigger } from "@/components/ui/select"

import { Select } from "@/components/ui/select"

import type React from "react"

import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { UNIVERSITIES, verifyUniversityEmail } from "@/lib/utils/university-verification"
import { Check, ChevronsUpDown, GraduationCap } from "lucide-react"
import { cn } from "@/lib/utils"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { Checkbox } from "@/components/ui/checkbox"

export default function SignUpPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [fullName, setFullName] = useState("")
  const [phoneNumber, setPhoneNumber] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [university, setUniversity] = useState<string>("")
  const [universityEmail, setUniversityEmail] = useState("")
  const [open, setOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [acceptedTerms, setAcceptedTerms] = useState(false)
  const [acceptedPrivacy, setAcceptedPrivacy] = useState(false)
  const router = useRouter()

  const isLatin1 = (str: string): boolean => {
    // Check if string contains only Latin1 characters (0-255)
    for (let i = 0; i < str.length; i++) {
      if (str.charCodeAt(i) > 255) {
        return false
      }
    }
    return true
  }

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault()
    const supabase = createClient()
    setIsLoading(true)
    setError(null)

    const sanitizedEmail = email.trim().toLowerCase()
    const sanitizedPassword = password.trim()

    if (!isLatin1(sanitizedEmail)) {
      setError("Email contains unsupported characters. Please use only standard ASCII characters.")
      setIsLoading(false)
      return
    }

    if (!isLatin1(sanitizedPassword)) {
      setError(
        "Password contains unsupported characters. Please use only standard ASCII characters (letters, numbers, and common symbols).",
      )
      setIsLoading(false)
      return
    }

    if (sanitizedPassword !== confirmPassword.trim()) {
      setError("Passwords do not match")
      setIsLoading(false)
      return
    }

    if (!acceptedTerms || !acceptedPrivacy) {
      setError("You must accept the Terms of Service and Privacy Policy to create an account")
      setIsLoading(false)
      return
    }

    // Verify university email if university is selected
    let isUniversityVerified = false
    if (university && university !== "other" && university !== "none") {
      if (!universityEmail.trim()) {
        setError("Please provide your university/college email for verification")
        setIsLoading(false)
        return
      }
      const sanitizedUniversityEmail = universityEmail.trim().toLowerCase()
      const verification = verifyUniversityEmail(sanitizedUniversityEmail, university)
      if (!verification.isValid) {
        setError(verification.message || "University/college email verification failed")
        setIsLoading(false)
        return
      }
      isUniversityVerified = true
    }

    try {
      const checkResponse = await fetch("/api/auth/check-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: sanitizedEmail }),
      })

      const { exists } = await checkResponse.json()

      if (exists) {
        setError("An account with this email already exists. Please sign in instead.")
        setIsLoading(false)
        return
      }

      let signUpResult
      try {
        signUpResult = await supabase.auth.signUp({
          email: sanitizedEmail,
          password: sanitizedPassword,
          options: {
            emailRedirectTo: "https://calendarai.dev/dashboard",
            data: {
              full_name: fullName.trim(),
              phone_number: phoneNumber.trim() || null,
              university: university && university !== "none" && university !== "other" ? university : null,
              university_verified: isUniversityVerified,
            },
          },
        })
      } catch (authError: unknown) {
        // Handle btoa or encoding errors
        if (authError instanceof Error && authError.message.includes("btoa")) {
          throw new Error(
            "Authentication error. Please ensure your email and password only contain standard characters.",
          )
        }
        throw authError
      }

      if (signUpResult?.error) {
        if (
          signUpResult.error.message.includes("already registered") ||
          signUpResult.error.message.includes("already exists") ||
          signUpResult.error.message.includes("duplicate")
        ) {
          throw new Error("An account with this email already exists. Please sign in instead.")
        }
        throw signUpResult.error
      }

      // Update profile with university and full_name data
      if (signUpResult?.data?.user) {
        const { error: profileError } = await supabase
          .from("profiles")
          .upsert({
            id: signUpResult.data.user.id,
            full_name: fullName.trim() || null,
            university: university && university !== "none" && university !== "other" ? university : null,
            university_verified: isUniversityVerified,
            updated_at: new Date().toISOString(),
          })

        if (profileError) {
          console.error("[CalendarAI] Error updating profile:", profileError)
          // Don't fail the signup if profile update fails, just log it
        }
      }

      router.push("/auth/sign-up-success")
    } catch (error: unknown) {
      console.error("[CalendarAI] Sign up error:", error)
      setError(error instanceof Error ? error.message : "An error occurred during sign up. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10 bg-gradient-to-br from-background via-background to-primary/5">
      <div className="absolute inset-0 -z-10 bg-[linear-gradient(to_right,hsl(var(--border))_1px,transparent_1px),linear-gradient(to_bottom,hsl(var(--border))_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_80%_50%_at_50%_50%,#000_40%,transparent_100%)] opacity-20" />
      <div className="w-full max-w-sm">
        <div className="flex flex-col gap-6">
          <div className="flex items-center justify-center gap-2 mb-2">
            <div className="rounded-xl bg-primary p-2">
              <svg className="h-6 w-6 text-primary-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <span className="text-xl font-bold">CalendarAI</span>
          </div>
          <Card className="border-border/50 shadow-lg">
            <CardHeader className="text-center">
              <CardTitle className="text-2xl font-bold">Create an account</CardTitle>
              <CardDescription>Get started with your AI-powered calendar</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSignUp}>
                <div className="flex flex-col gap-6">
                  <div className="grid gap-2">
                    <Label htmlFor="fullName">Full Name</Label>
                    <Input
                      id="fullName"
                      type="text"
                      placeholder="John Doe"
                      required
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="you@example.com"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="phone">Phone Number (Optional)</Label>
                    <Input
                      id="phone"
                      type="tel"
                      placeholder="+1 (555) 123-4567"
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="university" className="flex items-center gap-2">
                      <GraduationCap className="h-4 w-4" />
                      University/College (Optional)
                    </Label>
                    <Popover open={open} onOpenChange={setOpen}>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          role="combobox"
                          aria-expanded={open}
                          className="w-full justify-between font-normal bg-transparent"
                        >
                          {university
                            ? university === "none"
                              ? "Not in university/college"
                              : university === "other"
                                ? "Other university/college"
                                : UNIVERSITIES.find((uni) => uni.name === university)?.name
                            : "Search university/college..."}
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-[400px] p-0" align="start" side="bottom" sideOffset={4}>
                        <div className="border-b p-2">
                          <Input
                            placeholder="Search..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="h-9"
                          />
                        </div>
                        <div className="max-h-[300px] overflow-y-auto">
                          <div className="p-1">
                            <Button
                              variant="ghost"
                              className="w-full justify-start font-normal"
                              onClick={() => {
                                setUniversity("none")
                                setOpen(false)
                                setSearchQuery("")
                              }}
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  university === "none" ? "opacity-100" : "opacity-0",
                                )}
                              />
                              Not in university/college
                            </Button>
                            <Button
                              variant="ghost"
                              className="w-full justify-start font-normal"
                              onClick={() => {
                                setUniversity("other")
                                setOpen(false)
                                setSearchQuery("")
                              }}
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  university === "other" ? "opacity-100" : "opacity-0",
                                )}
                              />
                              Other university/college
                            </Button>
                            <div className="my-1 border-t" />
                            {UNIVERSITIES.filter(
                              (uni) =>
                                uni.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                                uni.country.toLowerCase().includes(searchQuery.toLowerCase()),
                            ).map((uni) => (
                              <Button
                                key={uni.name}
                                variant="ghost"
                                className="w-full justify-start font-normal"
                                onClick={() => {
                                  setUniversity(uni.name)
                                  setOpen(false)
                                  setSearchQuery("")
                                }}
                              >
                                <Check
                                  className={cn(
                                    "mr-2 h-4 w-4",
                                    university === uni.name ? "opacity-100" : "opacity-0",
                                  )}
                                />
                                {uni.name} ({uni.country})
                              </Button>
                            ))}
                          </div>
                        </div>
                      </PopoverContent>
                    </Popover>
                  </div>
                  {university && university !== "none" && university !== "other" && (
                    <div className="grid gap-2">
                      <Label htmlFor="universityEmail" className="flex items-center gap-2">
                        <GraduationCap className="h-4 w-4" />
                        University/College Email
                      </Label>
                      <Input
                        id="universityEmail"
                        type="email"
                        placeholder="student@university.edu"
                        required
                        value={universityEmail}
                        onChange={(e) => setUniversityEmail(e.target.value)}
                      />
                      <p className="text-xs text-muted-foreground">
                        This email will only be used to verify your affiliation with {UNIVERSITIES.find((uni) => uni.name === university)?.name}
                      </p>
                    </div>
                  )}
                  <div className="grid gap-2">
                    <Label htmlFor="password">Password</Label>
                    <Input
                      id="password"
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="confirmPassword">Confirm Password</Label>
                    <Input
                      id="confirmPassword"
                      type="password"
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                    />
                  </div>
                  <div className="space-y-3 rounded-lg bg-muted/30 p-3">
                    <div className="flex items-start gap-2">
                      <Checkbox
                        id="terms"
                        checked={acceptedTerms}
                        onCheckedChange={(checked) => setAcceptedTerms(checked as boolean)}
                        className="mt-1"
                      />
                      <label htmlFor="terms" className="text-sm leading-relaxed cursor-pointer">
                        I agree to the{" "}
                        <Link href="/terms" target="_blank" className="underline underline-offset-2 hover:text-primary">
                          Terms of Service
                        </Link>
                      </label>
                    </div>
                    <div className="flex items-start gap-2">
                      <Checkbox
                        id="privacy"
                        checked={acceptedPrivacy}
                        onCheckedChange={(checked) => setAcceptedPrivacy(checked as boolean)}
                        className="mt-1"
                      />
                      <label htmlFor="privacy" className="text-sm leading-relaxed cursor-pointer">
                        I agree to the{" "}
                        <Link href="/privacy" target="_blank" className="underline underline-offset-2 hover:text-primary">
                          Privacy Policy
                        </Link>
                      </label>
                    </div>
                  </div>
                  {error && <p className="text-sm text-destructive">{error}</p>}
                  <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? "Creating account..." : "Sign up"}
                  </Button>
                </div>
                <div className="mt-4 text-center text-sm">
                  Already have an account?{" "}
                  <Link href="/auth/login" className="underline underline-offset-4">
                    Sign in
                  </Link>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
