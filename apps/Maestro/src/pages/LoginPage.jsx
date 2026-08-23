import { useEffect, useState } from 'react'
import { ArrowLeft, ArrowRight, Check, LockKeyhole, Mail, Sparkles, User } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { Brand } from '../components/ui/Brand'
import { AuthBackdrop3D } from '../components/visual/AuthBackdrop3D'
import { useAuth } from '../contexts/AuthContext'

export function LoginPage() {
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [password, setPassword] = useState('')
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [mode, setMode] = useState('signin')
  const [transitioning, setTransitioning] = useState(false)
  const { signInWithEmail, signInWithPassword } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    document.body.classList.add('on-auth')
    return () => document.body.classList.remove('on-auth')
  }, [])

  const submit = async (event) => {
    event.preventDefault()
    setError('')
    setBusy(true)
    try {
      const result = isSignup
        ? await signInWithEmail(email, name)
        : await signInWithPassword(email, password)
      if (result.demo || !isSignup) {
        const destination = sessionStorage.getItem('maestro-after-auth') || '/app/chat'
        sessionStorage.removeItem('maestro-after-auth')
        navigate(destination)
      }
      else setSent(true)
    } catch (requestError) {
      setError(requestError.message || 'Não foi possível enviar o acesso.')
    } finally {
      setBusy(false)
    }
  }

  const isSignup = mode === 'signup'

  const switchMode = (next) => {
    if (next === mode) return
    setTransitioning(true)
    window.setTimeout(() => {
      setMode(next)
      setTransitioning(false)
    }, 280)
  }

  return (
    <div className="auth-page auth-page--immersive" data-mode={mode}>
      <div className="auth-visual">
        <AuthBackdrop3D intensity={mode} />
        <div className="auth-visual__overlay" />
        <Link to="/" className="auth-back"><ArrowLeft size={15} /> Voltar ao início</Link>
        <div className="auth-visual__content">
          <Brand light />
          <blockquote key={mode}>
            {isSignup
              ? '“Todo universo começa com uma única ideia — e a decisão de levá-la a sério.”'
              : '“Em um universo complexo, encontrar a resposta certa começa por preservar a pergunta certa.”'}
          </blockquote>
          <div className="auth-proof">
            <span><Sparkles size={15} /></span>
            <p><strong>2.324 itens conectados</strong>em um único mapa confiável</p>
          </div>
        </div>
      </div>
      <main className="auth-form-wrap">
        <div className={`auth-form ${transitioning ? 'is-transitioning' : ''}`} key={mode}>
          {sent ? (
            <div className="auth-success">
              <span><Check size={23} /></span>
              <h1>Confira seu e-mail</h1>
              <p>Enviamos um link seguro para <strong>{email}</strong>. Ele expira em poucos minutos.</p>
              <button type="button" className="button button--ghost" onClick={() => setSent(false)}>Usar outro e-mail</button>
            </div>
          ) : (
            <>
              <span className="eyebrow">{isSignup ? 'Crie sua conta gratuita' : 'Bem-vindo de volta'}</span>
              <h1>{isSignup ? 'Comece seu universo' : 'Entre no seu workspace'}</h1>
              <p>{isSignup ? 'Plano Free inclui 1 projeto e até 3 boards do Miro. Sem cartão.' : 'Entre com o e-mail e a senha do seu workspace.'}</p>
              <form onSubmit={submit}>
                {isSignup && (
                  <label htmlFor="name">Como devemos chamar você</label>
                )}
                {isSignup && (
                  <div className="input-with-icon"><User size={17} /><input id="name" type="text" value={name} onChange={(event) => setName(event.target.value)} placeholder="Seu nome criativo" required /></div>
                )}
                <label htmlFor="email">E-mail</label>
                <div className="input-with-icon"><Mail size={17} /><input id="email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="voce@exemplo.com" autoComplete="email" required /></div>
                {!isSignup && <label htmlFor="password">Senha</label>}
                {!isSignup && (
                  <div className="input-with-icon"><LockKeyhole size={17} /><input id="password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Sua senha" autoComplete="current-password" minLength={8} required /></div>
                )}
                {error && <span className="form-error">{error}</span>}
                <button className="button button--primary button--full" type="submit" disabled={busy}>{busy ? (isSignup ? 'Enviando...' : 'Entrando...') : <>{isSignup ? 'Criar conta' : 'Entrar'} <ArrowRight size={16} /></>}</button>
              </form>
              <div className="auth-mode-switch-row">
                <span>{isSignup ? 'Já tem uma conta?' : 'Ainda não tem conta?'}</span>
                <button type="button" className="auth-mode-pill" onClick={() => switchMode(isSignup ? 'signin' : 'signup')}>
                  {isSignup ? 'Entrar' : 'Criar conta gratuita'}
                </button>
              </div>
              <small>Ao continuar, você concorda com os Termos de Uso e a Política de Privacidade.</small>
            </>
          )}
        </div>
      </main>
    </div>
  )
}
