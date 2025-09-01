import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { HealthMetrics, Activity, InsertHealthMetrics, InsertActivity } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";

export function useHealthMetrics(days = 7) {
  return useQuery<HealthMetrics[]>({
    queryKey: ["/api/health-metrics", days],
    queryFn: async () => {
      const response = await fetch(`/api/health-metrics?days=${days}`);
      if (!response.ok) throw new Error("Failed to fetch health metrics");
      return response.json();
    },
  });
}

export function useActivities(days = 7) {
  return useQuery<Activity[]>({
    queryKey: ["/api/activities", days],
    queryFn: async () => {
      const response = await fetch(`/api/activities?days=${days}`);
      if (!response.ok) throw new Error("Failed to fetch activities");
      return response.json();
    },
  });
}

export function useCreateHealthMetrics() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: InsertHealthMetrics) => {
      const response = await apiRequest("POST", "/api/health-metrics", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/health-metrics"] });
    },
  });
}

export function useCreateActivity() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: InsertActivity) => {
      const response = await apiRequest("POST", "/api/activities", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/activities"] });
    },
  });
}

export function useHealthConnectImport() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/health-connect/import", {});
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/health-metrics"] });
    },
  });
}
