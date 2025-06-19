import { useState } from 'react'
import { supabase } from '../supabase'
import { Link, useNavigate } from 'react-router-dom'
import PasswordStrength from './PasswordStrength'

const SignUp = () => {
  const navigate = useNavigate()
  const [fullName, setFullName] = useState('')
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [organization, setOrganization] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(false)

  const organizations = ['Security', 'Organization A', 'Organization B', 'Organization C']

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    setLoading(true)

    if (!fullName || !username || !email || !organization || !password) {
      setError('Please fill in all fields.')
      setLoading(false)
      return
    }

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          username,
          organization,
        },
      },
    })

    if (error) {
      setError(error.message)
    } else if (data.user) {
      setSuccess('Registration successful! Please check your email to verify your account.')
      setTimeout(() => navigate('/'), 3000)
    }
    setLoading(false)
  }

  return (
    <div className="w-full max-w-lg p-8 space-y-8 bg-white border border-black">
      <h1 className="text-4xl font-bold text-center text-black">
        Create an Account
      </h1>
      <form onSubmit={handleSignUp} className="space-y-4">
        <div>
          <label htmlFor="fullName" className="text-sm font-bold text-black block">
            Full Name
          </label>
          <input
            id="fullName"
            type="text"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className="w-full mt-1 p-2 border border-black text-black bg-white focus:outline-none focus:ring-2 focus:ring-gray-400"
            required
          />
        </div>
        <div>
          <label htmlFor="username" className="text-sm font-bold text-black block">
            Username
          </label>
          <input
            id="username"
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="w-full mt-1 p-2 border border-black text-black bg-white focus:outline-none focus:ring-2 focus:ring-gray-400"
            required
          />
        </div>
        <div>
          <label htmlFor="email" className="text-sm font-bold text-black block">
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
          <label htmlFor="organization" className="text-sm font-bold text-black block">
            Organization
          </label>
          <select
            id="organization"
            value={organization}
            onChange={(e) => setOrganization(e.target.value)}
            className="w-full mt-1 p-2 border border-black text-black bg-white focus:outline-none focus:ring-2 focus:ring-gray-400"
            required
          >
            <option value="" disabled>
              Select an organization
            </option>
            {organizations.map(org => (
              <option key={org} value={org}>
                {org}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="password" className="text-sm font-bold text-black block">
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
          <PasswordStrength password={password} />
        </div>
        
        {error && <p className="text-sm text-center text-red-500">{error}</p>}
        {success && <p className="text-sm text-center text-green-600">{success}</p>}

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 font-bold text-white bg-black hover:bg-gray-800 disabled:bg-gray-400 transition-colors"
        >
          {loading ? 'Creating account...' : 'Create Account'}
        </button>
      </form>
      <p className="text-sm text-center text-black">
        Already have an account?{' '}
        <Link to="/" className="font-bold hover:underline">
          Login
        </Link>
      </p>
    </div>
  )
}

export default SignUp 