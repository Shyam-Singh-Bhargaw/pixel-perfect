import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { toast } from 'sonner';

export default function LoginPage() {
  const { signIn, signUp } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (isSignUp) {
        await signUp(email, password);
        toast.success('Account created! Check your email to confirm.');
      } else {
        await signIn(email, password);
        toast.success('Welcome back!');
      }
    } catch (err: any) {
      toast.error(err.message || 'Auth error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <Card className="w-full max-w-md border-border">
        <CardHeader className="text-center">
          <CardTitle className="text-3xl font-heading text-primary">PrepOS</CardTitle>
          <CardDescription className="text-muted-foreground">AI/ML Track • Job Prep Dashboard</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              type="email" placeholder="Email" value={email}
              onChange={e => setEmail(e.target.value)} required
              className="bg-secondary border-border"
            />
            <Input
              type="password" placeholder="Password" value={password}
              onChange={e => setPassword(e.target.value)} required minLength={6}
              className="bg-secondary border-border"
            />
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? '...' : isSignUp ? 'Sign Up' : 'Sign In'}
            </Button>
            <p className="text-center text-sm text-muted-foreground">
              {isSignUp ? 'Already have an account?' : "Don't have an account?"}{' '}
              <button type="button" className="text-primary hover:underline" onClick={() => setIsSignUp(!isSignUp)}>
                {isSignUp ? 'Sign In' : 'Sign Up'}
              </button>
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
