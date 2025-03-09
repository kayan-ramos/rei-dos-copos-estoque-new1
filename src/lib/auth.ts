// Simple authentication module without Supabase
export interface UserProfile {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'operator' | 'customer';
  must_change_password?: boolean;
}

// In-memory user store for demo/development
const users: UserProfile[] = [
  {
    id: 'admin',
    email: 'kayan.ramos@back2basics.com.br',
    name: 'Kayan Ramos',
    role: 'admin',
    must_change_password: true
  }
];

export async function signIn(email: string, password: string): Promise<UserProfile> {
  // For demo purposes, allow any password for non-admin users
  if (email === 'kayan.ramos@back2basics.com.br' && password === 'DWS#123456') {
    return users[0];
  }

  throw new Error('Invalid credentials');
}

export async function signUp(email: string, password: string, name: string): Promise<UserProfile> {
  const newUser: UserProfile = {
    id: Math.random().toString(36).substr(2, 9),
    email,
    name,
    role: 'customer'
  };
  users.push(newUser);
  return newUser;
}

export async function changePassword(userId: string, newPassword: string): Promise<void> {
  const user = users.find(u => u.id === userId);
  if (user) {
    user.must_change_password = false;
  }
}