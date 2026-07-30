import { 
  BusRoute, 
  StudentProfile, 
  BusAttendance, 
  AttendanceStatus 
} from '../models';

export class BusService {
  async getRoutes() {
    return BusRoute.find()
      .populate({
        path: 'driver',
        populate: {
          path: 'user',
          select: 'firstName lastName phone',
        },
      })
      .populate({
        path: 'students',
        populate: {
          path: 'user',
          select: 'firstName lastName',
        },
      });
  }

  async getRouteById(id: string) {
    return BusRoute.findById(id)
      .populate({
        path: 'driver',
        populate: {
          path: 'user',
          select: 'firstName lastName phone',
        },
      })
      .populate({
        path: 'students',
        populate: {
          path: 'user',
          select: 'firstName lastName',
        },
      });
  }

  async updateLiveLocation(routeId: string, latitude: number, longitude: number, etaMinutes?: number) {
    return BusRoute.findByIdAndUpdate(
      routeId,
      {
        latitude,
        longitude,
        etaMinutes,
        lastUpdated: new Date(),
      },
      { new: true }
    );
  }

  async assignDriver(routeId: string, driverId: string) {
    return BusRoute.findByIdAndUpdate(
      routeId,
      { driverId },
      { new: true }
    );
  }

  async assignStudentToRoute(studentId: string, routeId: string) {
    return StudentProfile.findByIdAndUpdate(
      studentId,
      { busRouteId: routeId },
      { new: true }
    );
  }

  async recordBoardingAttendance(data: {
    busRouteId: string;
    studentId: string;
    type: 'PICKUP' | 'DROP';
    status: AttendanceStatus;
  }) {
    return BusAttendance.create({
      busRouteId: data.busRouteId,
      studentId: data.studentId,
      type: data.type,
      status: data.status,
    });
  }

  async getRouteBoardingHistory(busRouteId: string, date: string) {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    return BusAttendance.find({
      busRouteId,
      recordedAt: {
        $gte: startOfDay,
        $lte: endOfDay,
      },
    })
      .populate({
        path: 'student',
        populate: {
          path: 'user',
          select: 'firstName lastName',
        },
      })
      .sort({ recordedAt: 1 });
  }

  async createRoute(data: any) {
    return BusRoute.create(data);
  }

  async updateRoute(id: string, data: any) {
    return BusRoute.findByIdAndUpdate(id, data, { new: true });
  }

  async deleteRoute(id: string) {
    await StudentProfile.updateMany({ busRouteId: id }, { $unset: { busRouteId: 1 } });
    return BusRoute.findByIdAndDelete(id);
  }

  async removeStudentFromRoute(studentId: string) {
    return StudentProfile.findByIdAndUpdate(studentId, { $unset: { busRouteId: 1 } }, { new: true });
  }
}
