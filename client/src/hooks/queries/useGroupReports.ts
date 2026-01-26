import { useQuery, useMutation } from '@tanstack/react-query';
import api from '../../services/api';

// Types
interface GroupInfo {
    _id: string;
    name: string;
    description?: string;
    code?: string;
    memberCount: number;
    settings: {
        canManagerAddUsers: boolean;
        canManagerRemoveUsers: boolean;
        canManagerEditUsers: boolean;
        canManagerManageBalance: boolean;
        canManagerViewReports: boolean;
        canManagerManageMeals: boolean;
    };
    isActive: boolean;
}

interface GroupMember {
    _id: string;
    name: string;
    email: string;
    phone?: string;
    balances: {
        breakfast: { amount: number };
        lunch: { amount: number };
        dinner: { amount: number };
    };
    group?: { _id: string; name: string };
}

interface MemberLunchReport {
    _id: string;
    name: string;
    email: string;
    phone?: string;
    daysOn: number;
    totalMeals: number;
    totalCharge: number;
    balance: number;
    dueAdvance: {
        amount: number;
        type: 'due' | 'advance' | 'settled';
    };
}

interface LunchSummaryResponse {
    group: { _id: string; name: string } | null;
    period: {
        year: number;
        month: number;
        startDate: string;
        endDate: string;
        lunchRate: number;
        totalDays: number;
    };
    members: MemberLunchReport[];
    summary: {
        totalMembers: number;
        totalMeals: number;
        totalCharge: number;
        totalDue: number;
        totalAdvance: number;
        membersWithDue: number;
        membersWithAdvance: number;
    };
}

interface DailyDetail {
    date: string;
    dayName: string;
    isOn: boolean;
    count: number;
    isManuallySet: boolean;
    isHoliday: boolean;
    holidayName?: string;
    isWeekend: boolean;
}

interface UserLunchStatement {
    user: {
        _id: string;
        name: string;
        email: string;
        phone?: string;
    };
    group: { _id: string; name: string } | null;
    period: {
        startDate: string;
        endDate: string;
        year: number;
        month: number;
        totalDays: number;
    };
    dailyDetails: DailyDetail[];
    summary: {
        totalDays: number;
        totalMeals: number;
        rate: number;
        totalCharge: number;
        currentBalance: number;
        dueAdvance: {
            amount: number;
            type: 'due' | 'advance' | 'settled';
        };
    };
    generatedBy: string;
    generatedAt: string;
}

// Get manager's group info
export const useMyGroup = () => {
    return useQuery({
        queryKey: ['myGroup'],
        queryFn: async () => {
            const { data } = await api.get('/group-reports/my-group');
            return data as GroupInfo;
        }
    });
};

// Get group members
export const useGroupMembers = (groupId?: string) => {
    return useQuery({
        queryKey: ['groupMembers', groupId],
        queryFn: async () => {
            const params = groupId ? { groupId } : {};
            const { data } = await api.get('/group-reports/members', { params });
            return data as GroupMember[];
        }
    });
};

// Get group lunch summary
export const useGroupLunchSummary = (year: number, month: number, groupId?: string) => {
    return useQuery({
        queryKey: ['groupLunchSummary', year, month, groupId],
        queryFn: async () => {
            const params: any = { year, month };
            if (groupId) params.groupId = groupId;
            const { data } = await api.get('/group-reports/lunch-summary', { params });
            return data as LunchSummaryResponse;
        },
        enabled: !!year && !!month
    });
};

// Get user lunch statement
export const useUserLunchStatement = (
    userId: string,
    options: {
        year?: number;
        month?: number;
        startDate?: string;
        endDate?: string;
    }
) => {
    return useQuery({
        queryKey: ['userLunchStatement', userId, options],
        queryFn: async () => {
            const { data } = await api.get(`/group-reports/user/${userId}/lunch-statement`, {
                params: options
            });
            return data as UserLunchStatement;
        },
        enabled: !!userId && (!!options.year && !!options.month) || (!!options.startDate && !!options.endDate)
    });
};

// Download user lunch statement PDF
export const useDownloadUserLunchPDF = () => {
    return useMutation({
        mutationFn: async ({
            userId,
            year,
            month,
            startDate,
            endDate
        }: {
            userId: string;
            year?: number;
            month?: number;
            startDate?: string;
            endDate?: string;
        }) => {
            const params: any = {};
            if (year && month) {
                params.year = year;
                params.month = month;
            }
            if (startDate && endDate) {
                params.startDate = startDate;
                params.endDate = endDate;
            }

            const response = await api.get(`/group-reports/user/${userId}/lunch-statement/pdf`, {
                params,
                responseType: 'blob'
            });

            // Create download link
            const blob = new Blob([response.data], { type: 'application/pdf' });
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;

            // Extract filename from response header or generate one
            const contentDisposition = response.headers['content-disposition'];
            let filename = `lunch-statement-${userId}-${year}-${month}.pdf`;
            if (contentDisposition) {
                const matches = /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/.exec(contentDisposition);
                if (matches && matches[1]) {
                    filename = matches[1].replace(/['"]/g, '');
                }
            }

            link.setAttribute('download', filename);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);

            return { success: true };
        }
    });
};

// Download group lunch statement PDF
export const useDownloadGroupLunchPDF = () => {
    return useMutation({
        mutationFn: async ({
            year,
            month,
            groupId
        }: {
            year: number;
            month: number;
            groupId?: string;
        }) => {
            const params: any = { year, month };
            if (groupId) params.groupId = groupId;

            const response = await api.get('/group-reports/group-statement/pdf', {
                params,
                responseType: 'blob'
            });

            // Create download link
            const blob = new Blob([response.data], { type: 'application/pdf' });
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `group-lunch-statement-${year}-${month}.pdf`);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);

            return { success: true };
        }
    });
};
