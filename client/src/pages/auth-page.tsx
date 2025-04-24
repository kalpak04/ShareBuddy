import { useAuth } from "@/hooks/use-auth";
import { useEffect } from "react";
import { useLocation } from "wouter";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Cloud, Lock, Server, Shield } from "lucide-react";
import { insertUserSchema, loginUserSchema } from "@shared/schema";

export default function AuthPage() {
  const [location, navigate] = useLocation();
  const { user, loginMutation, registerMutation } = useAuth();

  // Redirect if already logged in
  useEffect(() => {
    if (user) {
      navigate("/");
    }
  }, [user, navigate]);

  // Extended schemas with validation
  const loginSchema = loginUserSchema;
  const registerSchema = insertUserSchema.extend({
    passwordConfirm: z.string().min(6, {
      message: "Password must be at least 6 characters",
    }),
  }).refine((data) => data.password === data.passwordConfirm, {
    message: "Passwords don't match",
    path: ["passwordConfirm"],
  });

  // Form setup
  const loginForm = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: "",
      password: "",
    },
  });

  const registerForm = useForm<z.infer<typeof registerSchema>>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      username: "",
      email: "",
      password: "",
      passwordConfirm: "",
      fullName: "",
    },
  });

  function onLoginSubmit(values: z.infer<typeof loginSchema>) {
    loginMutation.mutate(values);
  }

  function onRegisterSubmit(values: z.infer<typeof registerSchema>) {
    const { passwordConfirm, ...userData } = values;
    registerMutation.mutate(userData);
  }

  return (
    <div className="min-h-screen bg-background flex flex-col md:flex-row">
      {/* Left column (form) */}
      <div className="w-full md:w-1/2 p-6 flex flex-col justify-center">
        <div className="mx-auto w-full max-w-md">
          <div className="flex items-center mb-6">
            <div className="h-10 w-10 rounded-md bg-primary flex items-center justify-center text-white mr-2">
              <Cloud size={24} />
            </div>
            <h1 className="text-2xl font-bold">ShareBuddy</h1>
          </div>

          <Tabs defaultValue="login" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="login">Login</TabsTrigger>
              <TabsTrigger value="register">Register</TabsTrigger>
            </TabsList>

            <TabsContent value="login">
              <Card>
                <CardHeader>
                  <CardTitle>Login to your account</CardTitle>
                  <CardDescription>
                    Enter your username and password to access your files
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Form {...loginForm}>
                    <form onSubmit={loginForm.handleSubmit(onLoginSubmit)} className="space-y-4">
                      <FormField
                        control={loginForm.control}
                        name="username"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Username</FormLabel>
                            <FormControl>
                              <Input placeholder="yourusername" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={loginForm.control}
                        name="password"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Password</FormLabel>
                            <FormControl>
                              <Input type="password" placeholder="••••••••" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <Button 
                        type="submit" 
                        className="w-full" 
                        disabled={loginMutation.isPending}
                      >
                        {loginMutation.isPending ? "Logging in..." : "Login"}
                      </Button>
                    </form>
                  </Form>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="register">
              <Card>
                <CardHeader>
                  <CardTitle>Create an account</CardTitle>
                  <CardDescription>
                    Join ShareBuddy to store and backup your important files
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Form {...registerForm}>
                    <form onSubmit={registerForm.handleSubmit(onRegisterSubmit)} className="space-y-4">
                      <FormField
                        control={registerForm.control}
                        name="username"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Username</FormLabel>
                            <FormControl>
                              <Input placeholder="yourusername" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={registerForm.control}
                        name="email"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Email</FormLabel>
                            <FormControl>
                              <Input type="email" placeholder="you@example.com" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={registerForm.control}
                        name="fullName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Full Name</FormLabel>
                            <FormControl>
                              <Input placeholder="John Doe" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={registerForm.control}
                        name="password"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Password</FormLabel>
                            <FormControl>
                              <Input type="password" placeholder="••••••••" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={registerForm.control}
                        name="passwordConfirm"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Confirm Password</FormLabel>
                            <FormControl>
                              <Input type="password" placeholder="••••••••" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <Button 
                        type="submit" 
                        className="w-full" 
                        disabled={registerMutation.isPending}
                      >
                        {registerMutation.isPending ? "Creating account..." : "Register"}
                      </Button>
                    </form>
                  </Form>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Right column (hero section) */}
      <div className="hidden md:flex md:w-1/2 bg-gradient-to-br from-primary to-purple-600 text-white p-12 flex-col justify-center">
        <div className="max-w-md mx-auto space-y-8">
          <h2 className="text-4xl font-bold">Free up your phone, not your memories</h2>
          <p className="text-lg text-white/90">
            ShareBuddy connects users needing storage with nearby devices offering unused space.
            Save photos, videos, and documents securely for 30-60% less than cloud storage.
          </p>

          <div className="space-y-6">
            <div className="flex">
              <div className="mr-4">
                <Server className="h-8 w-8 text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-xl">Affordable Storage</h3>
                <p className="text-white/80">Only ₹1/GB-month, 60% cheaper than regular cloud storage</p>
              </div>
            </div>

            <div className="flex">
              <div className="mr-4">
                <Lock className="h-8 w-8 text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-xl">Encrypted & Secure</h3>
                <p className="text-white/80">All your files are encrypted before leaving your device</p>
              </div>
            </div>

            <div className="flex">
              <div className="mr-4">
                <Shield className="h-8 w-8 text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-xl">Reliable Backup</h3>
                <p className="text-white/80">Your data is stored across multiple devices for redundancy</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
