import { Repository } from 'typeorm'
import { AppDataSource } from '../data-source'
import { RealEstate, Schedule, User } from '../entities'
import { AppError } from '../errors'
import { tCreateSchedule } from '../interfaces'

const create = async (dataSchedule: tCreateSchedule, idUser: number): Promise<Schedule> => {

    const receivedDate: string = dataSchedule.date
    const receivedHour: string = dataSchedule.hour
    const receivedRealEstateId: number = dataSchedule.realEstateId

    const now: Date = new Date(receivedDate)
    const day: number = (now.getDay())

    const hourConvertedNumber: number = +receivedHour.replace(':', '')

    if(hourConvertedNumber < 800 || hourConvertedNumber > 1800){
        throw new AppError('Invalid hour, available times are 8AM to 18PM', 400)
    }

    if(day === 0 || day === 6){
        throw new AppError('Invalid date, work days are monday to friday', 400)
    }

    const realEstateRepo: Repository<RealEstate> = AppDataSource.getRepository(RealEstate)
    const schedulesRepo: Repository<Schedule> = AppDataSource.getRepository(Schedule)
    const userRepo: Repository<User> = AppDataSource.getRepository(User)

    const realEstateExists: RealEstate | null = await realEstateRepo.findOneBy({
        id: +dataSchedule.realEstateId
    })

    if(!realEstateExists){
        throw new AppError('RealEstate not found', 404)
    }

    const visitAlreadyExists: RealEstate | null = await realEstateRepo.createQueryBuilder('realEstate').
    leftJoinAndSelect('realEstate.schedules', 'schedulesFromRealEstate').
    where('schedulesFromRealEstate.realEstateId = :id', {id: receivedRealEstateId}).
    andWhere('schedulesFromRealEstate.date = :date', {date: receivedDate}).
    andWhere('schedulesFromRealEstate.hour = :hour', {hour: receivedHour}).
    getOne()

    if(visitAlreadyExists !== null){
        throw new AppError('Schedule to this real estate at this date and time already exists', 409)
    }

    const ensureOneVisitSameTime: Schedule | null = await schedulesRepo.createQueryBuilder('schedules').
    where('schedules.userId = :id', {id: idUser}).
    andWhere('schedules.date = :date', {date: receivedDate}).
    andWhere('schedules.hour = :hour', {hour: receivedHour}).
    getOne()

    if(ensureOneVisitSameTime){
        throw new AppError('User schedule to this real estate at this date and time already exists', 409)
    }

    const real: RealEstate | null = await realEstateRepo.findOneBy({id: receivedRealEstateId})
    const user: User | null = await userRepo.findOneBy({id: idUser})

    const newSchedule: Schedule = schedulesRepo.create({
        realEstate: real!,
        user: user!,
        date: receivedDate,
        hour: receivedHour
    })

    await schedulesRepo.save(newSchedule)
    return newSchedule
} 

const list = async (idRealEstate: number): Promise<RealEstate | void> => {

    const realEstateRepo: Repository<RealEstate> = AppDataSource.getRepository(RealEstate)

    const test: RealEstate | null = await realEstateRepo.createQueryBuilder('realRepo')
    .innerJoinAndSelect('realRepo.address', 'addressReal')
    .innerJoinAndSelect('realRepo.category', 'categoryRepo')
    .innerJoinAndSelect('realRepo.schedules', 'schedulesReal')
    .innerJoinAndSelect('schedulesReal.user', 'users')
    .where('realRepo.id = :id', { id: idRealEstate })
    .getOne()

    if(!test){
        throw new AppError('RealEstate not found', 404)
    }

    return test!
}

export default { create, list }