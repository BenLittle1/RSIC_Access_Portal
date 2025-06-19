interface PasswordStrengthProps {
  password: string
}

const PasswordStrength = ({ password }: PasswordStrengthProps) => {
  const getStrength = () => {
    let score = 0
    if (!password) return score
    if (password.length > 8) score++
    if (/[A-Z]/.test(password)) score++
    if (/[a-z]/.test(password)) score++
    if (/[0-9]/.test(password)) score++
    if (/[^A-Za-z0-9]/.test(password)) score++
    return score
  }

  const strength = getStrength()
  const strengthText = ['Very Weak', 'Weak', 'Fair', 'Good', 'Strong', 'Very Strong']
  const color = ['bg-gray-200', 'bg-red-500', 'bg-red-400', 'bg-yellow-400', 'bg-green-300', 'bg-green-500']

  return (
    <div className="mt-1">
      <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
        <div
          className={`h-full transition-all duration-300 ${color[strength]}`}
          style={{ width: `${(strength / 5) * 100}%` }}
        />
      </div>
      <p className="text-xs text-right mt-1 h-4">{password && strengthText[strength]}</p>
    </div>
  )
}

export default PasswordStrength 