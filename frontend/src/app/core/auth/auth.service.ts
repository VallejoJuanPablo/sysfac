import { Injectable, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { tap } from 'rxjs';

interface LoginResponse {
  token: string;
  usuario: {
    id: number;
    username: string;
    nombre: string;
    rol: string;
  };
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private _token = signal<string | null>(localStorage.getItem('sf_token'));
  private _usuario = signal<LoginResponse['usuario'] | null>(
    JSON.parse(localStorage.getItem('sf_usuario') || 'null')
  );

  isAuthenticated = computed(() => !!this._token());
  usuario = computed(() => this._usuario());
  token = computed(() => this._token());

  constructor(private http: HttpClient, private router: Router) {}

  login(username: string, password: string) {
    return this.http.post<LoginResponse>('/api/auth/login', { username, password }).pipe(
      tap((res) => {
        localStorage.setItem('sf_token', res.token);
        localStorage.setItem('sf_usuario', JSON.stringify(res.usuario));
        this._token.set(res.token);
        this._usuario.set(res.usuario);
      })
    );
  }

  logout() {
    localStorage.removeItem('sf_token');
    localStorage.removeItem('sf_usuario');
    this._token.set(null);
    this._usuario.set(null);
    this.router.navigate(['/login']);
  }
}
