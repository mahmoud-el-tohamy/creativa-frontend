import api from "./api";

export interface Track {
  id: string;
  name: string;
  createdAt: string;
}

export const tracksAPI = {
  getAll: () => api.get<{ _id: string; name: string; createdAt: string }[]>("/tracks"),
  add: (name: string) => api.post<{ _id: string; name: string; createdAt: string }>("/tracks", { name }),
  remove: (id: string) => api.delete<{ message: string }>(`/tracks/${id}`),
};

export async function getTracks(): Promise<Track[]> {
  const res = await tracksAPI.getAll();
  return res.data.map((t) => ({ ...t, id: t._id }));
}

export async function addTrack(name: string): Promise<Track> {
  const res = await tracksAPI.add(name);
  return { ...res.data, id: res.data._id };
}

export async function removeTrack(id: string): Promise<void> {
  await tracksAPI.remove(id);
}
