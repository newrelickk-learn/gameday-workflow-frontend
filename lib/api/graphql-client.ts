
import type {
  LoginRequest,
  LoginResponse,
  User,
  Application,
  CreateApplicationRequest,
  Approval,
  UpdateApprovalRequest,
  Notification,
  City,
  EstimateTravelCostResponse,
} from './types';
import { handleGraphQLStub } from './graphql-stub-handler';

const GRAPHQL_ENDPOINT = 
  process.env.NODE_ENV === 'test' && process.env.NEXT_PUBLIC_USE_STUBS !== 'true'
    ? (process.env.NEXT_PUBLIC_GRAPHQL_URL || 'http://localhost:3000/api/graphql')
    : '/api/graphql';

async function graphqlRequest<T>(query: string, variables?: Record<string, any>): Promise<T> {
  const useStubs = process.env.NEXT_PUBLIC_USE_STUBS === 'true';
  
  if (typeof window === 'undefined' && process.env.NODE_ENV !== 'test') {
    if (useStubs) {
      if (process.env.NODE_ENV === 'development') {
        console.log('[GraphQL Client] サーバー側 - スタブモード: GraphQLクエリをスタブデータで処理');
        console.log('[GraphQL Client] Query:', query.trim().substring(0, 100));
        console.log('[GraphQL Client] Variables:', variables);
      }
      const stubData = await handleGraphQLStub(query, variables);
      return stubData as T;
    }
    throw new Error('Server-side GraphQL requests are only supported in stub mode. Set NEXT_PUBLIC_USE_STUBS=true for server-side rendering.');
  }
  
  if (process.env.NODE_ENV === 'test') {
    if (useStubs) {
      if (process.env.NODE_ENV === 'test') {
        console.log('[GraphQL Client] テスト環境 - スタブモード: GraphQLクエリをスタブデータで処理');
        console.log('[GraphQL Client] Query:', query.trim().substring(0, 100));
        console.log('[GraphQL Client] Variables:', variables);
      }
      const stubData = await handleGraphQLStub(query, variables);
      return stubData as T;
    }
  }

  const token = typeof localStorage !== 'undefined' ? localStorage.getItem('token') : null;
  
  if (process.env.NODE_ENV === 'development') {
    console.log('[GraphQL Client] クライアント側 - 本番モード: GraphQLエンドポイントにリクエスト送信');
    console.log('[GraphQL Client] Endpoint:', GRAPHQL_ENDPOINT);
    console.log('[GraphQL Client] Query:', query.trim().substring(0, 100));
    console.log('[GraphQL Client] Variables:', variables);
  }
  
  const response = await fetch(GRAPHQL_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
    },
    body: JSON.stringify({
      query,
      variables,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('[GraphQL Client] Request failed:', response.status, errorText);
    throw new Error(`GraphQL request failed: ${response.statusText}`);
  }

  const result = await response.json();

  if (result.errors) {
    console.error('[GraphQL Client] GraphQL errors:', result.errors);
    const graphqlError = result.errors[0];
    const error = new Error(graphqlError?.message || 'GraphQL error') as Error & { code?: string };
    error.code = graphqlError?.extensions?.code;
    throw error;
  }

  if (process.env.NODE_ENV === 'development') {
    console.log('[GraphQL Client] Response:', result.data);
  }

  return result.data;
}

export const graphqlClient = {
  auth: {
    async login(credentials: LoginRequest): Promise<LoginResponse> {
      const query = `
        mutation Login($input: LoginInput!) {
          login(input: $input) {
            token
            user {
              id
              name
              email
              role
              department
              companyId
            }
          }
        }
      `;
      const data = await graphqlRequest<{ login: LoginResponse }>(query, {
        input: credentials,
      });
      return data.login;
    },

    async getUser(id: string): Promise<User> {
      const query = `
        query GetUser($id: ID!) {
          user(id: $id) {
            id
            name
            email
            role
            department
          }
        }
      `;
      const data = await graphqlRequest<{ user: User }>(query, { id });
      return data.user;
    },
  },

  users: {
    async getCompanyUsers(): Promise<User[]> {
      const query = `
        query UsersByCompany {
          usersByCompany {
            id
            name
            email
            role
            department
            companyId
            managerId
          }
        }
      `;
      const data = await graphqlRequest<{ usersByCompany: User[] }>(query);
      return data.usersByCompany;
    },

    async getUserDetail(id: string): Promise<User> {
      const query = `
        query GetUserDetail($id: ID!) {
          user(id: $id) {
            id
            name
            email
            role
            department
            companyId
            managerId
          }
        }
      `;
      const data = await graphqlRequest<{ user: User }>(query, { id });
      return data.user;
    },

    async updateManager(id: string, managerId: number | null): Promise<User> {
      const query = `
        mutation UpdateUserManager($id: ID!, $input: UpdateUserManagerInput!) {
          updateUserManager(id: $id, input: $input) {
            id
            name
            email
            role
            department
            companyId
            managerId
          }
        }
      `;
      const data = await graphqlRequest<{ updateUserManager: User }>(query, {
        id,
        input: { managerId },
      });
      return data.updateUserManager;
    },
  },

  applications: {
    async getApplications(applicantId?: string): Promise<Application[]> {
      const query = `
        query GetApplications($applicantId: ID) {
          applications(applicantId: $applicantId) {
            id
            applicationNumber
            type
            title
            description
            amount
            startDate
            endDate
            days
            status
            applicantId
            applicantName
            applicantDepartment
            currentStep
            totalSteps
            nextApproverId
            nextApproverName
            nextApproverDepartment
            latestComment
            receiptImageUrls
            createdAt
            updatedAt
          }
        }
      `;
      const data = await graphqlRequest<{ applications: Application[] }>(query, { applicantId });
      return data.applications;
    },

    async getApplicationsCount(status?: 'pending' | 'approved' | 'rejected'): Promise<number> {
      const query = `
        query GetApplicationsCount($status: ApplicationStatus) {
          applicationsCount(status: $status)
        }
      `;
      const data = await graphqlRequest<{ applicationsCount: number }>(query, { status });
      return data.applicationsCount;
    },

    async getApplication(id: string): Promise<Application> {
      const query = `
        query GetApplication($id: ID!) {
          application(id: $id) {
            id
            applicationNumber
            type
            title
            description
            amount
            startDate
            endDate
            days
            status
            applicantId
            applicantName
            applicantDepartment
            currentStep
            totalSteps
            nextApproverId
            nextApproverName
            nextApproverDepartment
            latestComment
            receiptImageUrls
            createdAt
            updatedAt
          }
        }
      `;
      const data = await graphqlRequest<{ application: Application }>(query, { id });
      return data.application;
    },

    async createApplication(data: CreateApplicationRequest): Promise<Application> {
      const query = `
        mutation CreateApplication($input: CreateApplicationInput!) {
          createApplication(input: $input) {
            id
            applicationNumber
            type
            title
            description
            amount
            startDate
            endDate
            days
            status
            applicantId
            applicantName
            applicantDepartment
            currentStep
            totalSteps
            nextApproverId
            nextApproverName
            nextApproverDepartment
            createdAt
            updatedAt
          }
        }
      `;
      const result = await graphqlRequest<{ createApplication: Application }>(query, {
        input: data,
      });
      return result.createApplication;
    },
  },

  approvals: {
    async getApprovals(): Promise<Approval[]> {
      const query = `
        query GetApprovals {
          approvals {
            id
            applicationId
            approverId
            approverName
            approverDepartment
            status
            comment
            step
            createdAt
            updatedAt
          }
        }
      `;
      const data = await graphqlRequest<{ approvals: Approval[] }>(query);
      return data.approvals;
    },

    async getApproval(id: string): Promise<Approval> {
      const query = `
        query GetApproval($id: ID!) {
          approval(id: $id) {
            id
            applicationId
            approverId
            approverName
            approverDepartment
            status
            comment
            step
            createdAt
            updatedAt
          }
        }
      `;
      const data = await graphqlRequest<{ approval: Approval }>(query, { id });
      return data.approval;
    },

    async getApprovalsByApplication(applicationId: string): Promise<Approval[]> {
      const query = `
        query GetApprovalsByApplication($applicationId: ID!) {
          approvalsByApplication(applicationId: $applicationId) {
            id
            applicationId
            approverId
            approverName
            approverDepartment
            status
            comment
            step
            createdAt
            updatedAt
          }
        }
      `;
      const data = await graphqlRequest<{ approvalsByApplication: Approval[] }>(query, {
        applicationId,
      });
      return data.approvalsByApplication;
    },

    async updateApproval(id: string, data: UpdateApprovalRequest): Promise<Approval> {
      const query = `
        mutation UpdateApproval($id: ID!, $input: UpdateApprovalInput!) {
          updateApproval(id: $id, input: $input) {
            id
            applicationId
            approverId
            approverName
            approverDepartment
            status
            comment
            step
            createdAt
            updatedAt
          }
        }
      `;
      const result = await graphqlRequest<{ updateApproval: Approval }>(query, {
        id,
        input: {
          status: data.status,
          comment: data.comment,
          approverId: data.approverId,
          applicationId: data.applicationId,
        },
      });
      return result.updateApproval;
    },
  },

  travel: {
    async getCities(): Promise<City[]> {
      const query = `
        query Cities {
          cities {
            id
            nameJa
            isUnstable
          }
        }
      `;
      const data = await graphqlRequest<{ cities: City[] }>(query);
      return data.cities;
    },

    async estimateCost(input: {
      departureCityId: string;
      arrivalCityId: string;
      description: string;
      companyId?: number;
    }): Promise<EstimateTravelCostResponse> {
      const query = `
        query EstimateTravelCost($input: EstimateTravelCostInput!) {
          estimateTravelCost(input: $input) {
            amount
            currency
          }
        }
      `;
      const data = await graphqlRequest<{ estimateTravelCost: EstimateTravelCostResponse }>(query, {
        input,
      });
      return data.estimateTravelCost;
    },
  },

  notifications: {
    async getNotificationHistory(recipientId: string): Promise<Notification[]> {
      const query = `
        query NotificationHistory($recipientId: String!) {
          notificationHistory(recipientId: $recipientId) {
            id
            notificationType
            channel
            recipientId
            recipientEmail
            subject
            body
            sentAt
            createdAt
          }
        }
      `;
      const data = await graphqlRequest<{ notificationHistory: Notification[] }>(query, {
        recipientId,
      });
      return data.notificationHistory;
    },
  },

  ai: {
    async generateApplicationSuggestion(prompt: string): Promise<string> {
      const query = `
        mutation GenerateApplicationSuggestion($prompt: String!) {
          generateApplicationSuggestion(prompt: $prompt)
        }
      `;
      const data = await graphqlRequest<{ generateApplicationSuggestion: string }>(query, {
        prompt,
      });
      return data.generateApplicationSuggestion;
    },

    async analyzeApplication(applicationId: string): Promise<{
      risk: 'low' | 'medium' | 'high';
      summary: string;
    }> {
      const query = `
        query AnalyzeApplication($applicationId: ID!) {
          analyzeApplication(applicationId: $applicationId) {
            risk
            summary
          }
        }
      `;
      const data = await graphqlRequest<{
        analyzeApplication: { risk: 'low' | 'medium' | 'high'; summary: string };
      }>(query, { applicationId });
      return data.analyzeApplication;
    },

    async askChat(question: string): Promise<string> {
      const query = `
        mutation AskChat($question: String!) {
          askChat(question: $question)
        }
      `;
      const data = await graphqlRequest<{ askChat: string }>(query, {
        question,
      });
      return data.askChat;
    },
  },

  chapters: {
    async getDiagnosisOptions(chapter: number): Promise<string[]> {
      const query = `
        query ChapterDiagnosisOptions($chapter: Int!) {
          chapterDiagnosisOptions(chapter: $chapter)
        }
      `;
      const data = await graphqlRequest<{ chapterDiagnosisOptions: string[] }>(query, {
        chapter,
      });
      return data.chapterDiagnosisOptions;
    },

    async checkAnswer(chapter: number, selectedText: string): Promise<boolean> {
      const query = `
        mutation CheckChapterAnswer($chapter: Int!, $selectedText: String!) {
          checkChapterAnswer(chapter: $chapter, selectedText: $selectedText)
        }
      `;
      const data = await graphqlRequest<{ checkChapterAnswer: boolean }>(query, {
        chapter,
        selectedText,
      });
      return data.checkChapterAnswer;
    },

    async checkDependencyChain(dependencyChain: string[]): Promise<boolean> {
      const query = `
        mutation CheckDependencyChain($dependencyChain: [String!]!) {
          checkDependencyChain(dependencyChain: $dependencyChain)
        }
      `;
      const data = await graphqlRequest<{ checkDependencyChain: boolean }>(query, {
        dependencyChain,
      });
      return data.checkDependencyChain;
    },

    async getClearedChapters(): Promise<number[]> {
      const query = `
        query ClearedChapters {
          clearedChapters
        }
      `;
      const data = await graphqlRequest<{ clearedChapters: number[] }>(query);
      return data.clearedChapters;
    },

    async getNPlusOneQuizOptions(): Promise<{ q1: string[]; q2: string[]; q3: string[] }> {
      const query = `
        query NPlusOneQuizOptions {
          nPlusOneQuizOptions {
            q1
            q2
            q3
          }
        }
      `;
      const data = await graphqlRequest<{ nPlusOneQuizOptions: { q1: string[]; q2: string[]; q3: string[] } }>(query);
      return data.nPlusOneQuizOptions;
    },

    async checkNPlusOneQuizAnswers(answers: {
      q1: string[];
      q2: string[];
      q3: string[];
    }): Promise<{ q1: boolean; q2: boolean; q3: boolean; allCorrect: boolean }> {
      const query = `
        mutation CheckNPlusOneQuizAnswers($input: NPlusOneQuizAnswersInput!) {
          checkNPlusOneQuizAnswers(input: $input) {
            q1
            q2
            q3
            allCorrect
          }
        }
      `;
      const data = await graphqlRequest<{
        checkNPlusOneQuizAnswers: { q1: boolean; q2: boolean; q3: boolean; allCorrect: boolean };
      }>(query, { input: answers });
      return data.checkNPlusOneQuizAnswers;
    },

    async getRageClickQuizOptions(): Promise<{ q1: string[]; q2: string[]; q3: string[] }> {
      const query = `
        query RageClickQuizOptions {
          rageClickQuizOptions {
            q1
            q2
            q3
          }
        }
      `;
      const data = await graphqlRequest<{ rageClickQuizOptions: { q1: string[]; q2: string[]; q3: string[] } }>(query);
      return data.rageClickQuizOptions;
    },

    async checkRageClickQuizAnswers(answers: {
      q1: string;
      q2: string;
      q3: string;
    }): Promise<{ q1: boolean; q2: boolean; q3: boolean; allCorrect: boolean }> {
      const query = `
        mutation CheckRageClickQuizAnswers($input: RageClickQuizAnswersInput!) {
          checkRageClickQuizAnswers(input: $input) {
            q1
            q2
            q3
            allCorrect
          }
        }
      `;
      const data = await graphqlRequest<{
        checkRageClickQuizAnswers: { q1: boolean; q2: boolean; q3: boolean; allCorrect: boolean };
      }>(query, { input: answers });
      return data.checkRageClickQuizAnswers;
    },
  },
};

