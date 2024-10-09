import { Injectable } from '@angular/core';
import createAuth0Client, { Auth0Client, Auth0ClientOptions } from '@auth0/auth0-spa-js';
import { BehaviorSubject, from, Observable, of, throwError } from 'rxjs';
import { catchError, concatMap, tap } from 'rxjs/operators';
import { Router } from '@angular/router';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private auth0Client!: Auth0Client;
  private userProfileSubject$ = new BehaviorSubject<any>(null);
  public userProfile$ = this.userProfileSubject$.asObservable();
  private loggedIn = new BehaviorSubject<boolean>(false);

  constructor(private router: Router) {
    const config: Auth0ClientOptions = {
      domain: 'denios.eu.auth0.com',
      clientId: '07mcPcfLzAhGZUflu2P9T4eYYXyOR8Ox'
    };

    from(createAuth0Client(config)).pipe(
      tap((client: Auth0Client) => this.auth0Client = client),
      concatMap(() => this.handleAuthCallback()),
      concatMap(() => from(this.auth0Client.isAuthenticated())),
      tap((loggedIn: boolean) => this.loggedIn.next(loggedIn)),
      concatMap((loggedIn: boolean) => loggedIn ? from(this.auth0Client.getUser()) : of(null)),
      tap(user => this.userProfileSubject$.next(user))
    ).subscribe();
  }

  login(email: string, password: string): Observable<any> {
    return from(this.auth0Client.loginWithRedirect({
      redirect_uri: `${window.location.origin}/callback`,
      login_hint: email
    }));
  }

  signup(email: string, password: string): Observable<any> {
    return from(this.auth0Client.loginWithRedirect({
      redirect_uri: `${window.location.origin}/callback`,
      login_hint: email,
      screen_hint: 'signup'
    }));
  }

  logout(): void {
    this.auth0Client.logout({
      openUrl(url) {
        window.location.replace(url);
      }
    });
    this.userProfileSubject$.next(null);
    this.loggedIn.next(false);
  }

  private handleAuthCallback(): Observable<any> {
    return of(window.location.search).pipe(
      concatMap(query => {
        if (query.includes('code=') && query.includes('state=')) {
          return from(this.auth0Client.handleRedirectCallback()).pipe(
            tap(cbResult => this.router.navigate(['/']))
          );
        }
        return of(undefined);
      }),
      catchError(err => throwError(err))
    );
  }
}
