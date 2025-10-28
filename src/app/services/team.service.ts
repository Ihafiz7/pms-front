import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { catchError, map, Observable, switchMap } from 'rxjs';
import { environment } from 'src/environments/environment';
import { TeamRequest, TeamResponse, TeamMemberRequest, User, TeamMemberResponse } from '../models/team.model';

@Injectable({
  providedIn: 'root'
})
export class TeamService {

  private apiUrl = `${environment.apiUrl}/teams`;

  constructor(private http: HttpClient) { }

  // Existing team methods
  createTeam(team: TeamRequest): Observable<TeamResponse> {
    return this.http.post<TeamResponse>(this.apiUrl, team);
  }

  getAllTeams(): Observable<TeamResponse[]> {
    return this.http.get<TeamResponse[]>(this.apiUrl);
  }

  getActiveTeams(): Observable<TeamResponse[]> {
    return this.http.get<TeamResponse[]>(`${this.apiUrl}/active`);
  }

  updateTeam(id: number, team: TeamRequest): Observable<TeamResponse> {
    return this.http.put<TeamResponse>(`${this.apiUrl}/${id}`, team);
  }

  deleteTeam(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }

  addTeamMembers(id: number, request: TeamMemberRequest): Observable<TeamResponse> {
    return this.http.post<TeamResponse>(`${this.apiUrl}/${id}/members`, request);
  }

  removeTeamMembers(id: number, request: TeamMemberRequest): Observable<TeamResponse> {
    return this.http.delete<TeamResponse>(`${this.apiUrl}/${id}/members`, { body: request });
  }

  getTeamsByLead(leadId: number): Observable<TeamResponse[]> {
    return this.http.get<TeamResponse[]>(`${this.apiUrl}/lead/${leadId}`);
  }

  getTeamsByMember(memberId: number): Observable<TeamResponse[]> {
    return this.http.get<TeamResponse[]>(`${this.apiUrl}/member/${memberId}`);
  }

  searchTeams(keyword: string): Observable<TeamResponse[]> {
    return this.http.get<TeamResponse[]>(`${this.apiUrl}/search`, {
      params: new HttpParams().set('keyword', keyword)
    });
  }

  deactivateTeam(id: number): Observable<TeamResponse> {
    return this.http.patch<TeamResponse>(`${this.apiUrl}/${id}/deactivate`, {});
  }

  activateTeam(id: number): Observable<TeamResponse> {
    return this.http.patch<TeamResponse>(`${this.apiUrl}/${id}/activate`, {});
  }

  // // New methods for member management
  // getAvailableUsers(teamId: number): Observable<User[]> {
  //   return this.http.get<User[]>(`${this.apiUrl}/${teamId}/available-users`);
  // }

  getAllUsers(): Observable<User[]> {
    return this.http.get<User[]>(`${environment.apiUrl}/users/active`);
  }

  searchUsers(keyword: string): Observable<User[]> {
    return this.http.get<User[]>(`${environment.apiUrl}/pms/users/search`, {
      params: new HttpParams().set('keyword', keyword)
    });
  }

  getUserById(userId: number): Observable<User> {
    return this.http.get<User>(`${environment.apiUrl}/pms/users/${userId}`);
  }

  // Add these methods to your TeamService

  // Convert TeamMemberResponse to User
  private convertTeamMemberToUser(member: TeamMemberResponse): User {
    return {
      userId: member.userId,
      firstName: member.firstName,
      lastName: member.lastName,
      email: member.email,
      role: member.role,
      department: member.department,
      isActive: true, // Default to true since they're active team members
      createdAt: new Date() // Use current date as fallback
    };
  }

  // Convert TeamMemberResponse array to User array
  private convertTeamMembersToUsers(members: TeamMemberResponse[]): User[] {
    return members.map(member => this.convertTeamMemberToUser(member));
  }

  // Update the getTeamById method to use conversion
  getTeamById(id: number): Observable<TeamResponse> {
    return this.http.get<TeamResponse>(`${this.apiUrl}/${id}`);
  }

  // Add a method to get team with users
  getTeamWithUsers(id: number): Observable<{ team: TeamResponse, users: User[] }> {
    return this.getTeamById(id).pipe(
      map(team => ({
        team,
        users: this.convertTeamMembersToUsers(team.members || [])
      }))
    );
  }

  getAvailableUsers(teamId: number): Observable<User[]> {
  // If backend endpoint exists, use it
  return this.http.get<User[]>(`${this.apiUrl}/${teamId}/available-users`).pipe(
    catchError((error: any): Observable<User[]> => {
      // If endpoint doesn't exist, fallback to frontend filtering
      console.warn('Available users endpoint not found, using frontend filtering');
      return this.getAllUsers().pipe(
        switchMap((allUsers: User[]) => this.getTeamById(teamId).pipe(
          map((team: TeamResponse) => {
            const currentMemberIds = team.members?.map(member => member.userId) || [];
            return allUsers.filter(user => 
              user.isActive && !currentMemberIds.includes(user.userId)
            );
          })
        ))
      );
    })
  );
}
}
