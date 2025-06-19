import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { useNavigate, Link } from 'react-router-dom'

const Login = () => {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    if (!email || !password) {
      setError('Please fill in all fields.')
      setLoading(false)
      return
    }

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      setError(error.message)
    } else {
      navigate('/dashboard')
    }
    setLoading(false)
  }

  return (
    <div className="w-full max-w-md p-8 space-y-8 bg-white border border-black">
      <h1 className="text-4xl font-bold text-center text-black">
        SRIC Access Portal
      </h1>
      <form onSubmit={handleLogin} className="space-y-6">
        <div>
          <label
            htmlFor="email"
            className="text-sm font-bold text-black block"
          >
            Email
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full mt-1 p-2 border border-black text-black bg-white focus:outline-none focus:ring-2 focus:ring-gray-400"
            required
          />
        </div>
        <div>
          <label
            htmlFor="password"
            className="text-sm font-bold text-black block"
          >
            Password
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full mt-1 p-2 border border-black text-black bg-white focus:outline-none focus:ring-2 focus:ring-gray-400"
            required
          />
        </div>
        {error && <p className="text-sm text-center text-red-500">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 font-bold text-white bg-black hover:bg-gray-800 disabled:bg-gray-400 transition-colors"
        >
          {loading ? 'Logging in...' : 'Login'}
        </button>
      </form>
      <p className="text-sm text-center text-black">
        Need an account?{' '}
        <Link to="/signup" className="font-bold hover:underline">
          Create a new account
        </Link>
      </p>
    </div>
  )
}

export default Login 