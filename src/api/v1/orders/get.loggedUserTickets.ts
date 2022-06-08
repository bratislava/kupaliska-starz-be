import { Request, Response, NextFunction } from "express";
import { azureGetAzureData, isAzureAutehnticated } from "../../../utils/azureAuthentication";
import ErrorBuilder from "../../../utils/ErrorBuilder";
import { models } from "../../../db/models";
import { ENTRY_TYPE, ORDER_STATE } from "../../../utils/enums";
import { generateQrCode } from "../../../utils/qrCodeGenerator";

const { Ticket, Order, TicketType, AssociatedSwimmer, Entry, SwimmingPool } = models;

interface GetEntry {
    id: string,
    poolName: string,
    from: number,
    to: number | null,
}

interface GetTicket {
    id: string,
    type: string,
    remainingEntries: number,
    ownerName: string,
    ownerId: string,
    usedDate: string,
    entries: GetEntry[],
    qrCode: string | Buffer,
    price: number,
}

export const workflow = async (
	req: Request,
	res: Response,
	next: NextFunction
) => { 		
try {
    let authTest = false
    try {
        authTest = await isAzureAutehnticated(req)
    } catch(err) {
        throw new ErrorBuilder(401, req.t("error:notAuthenticated"));
    }
    let loggedUser = null;
    if (authTest) {
        loggedUser = await azureGetAzureData(req);
    } else {
        throw new ErrorBuilder(401, req.t("error:notAuthenticated"));
    }

    const tickets = await Ticket.findAll({where: {loggedUserId: loggedUser.oid}, order: [['createdAt', 'DESC'],]})

    let result: GetTicket[] = [];
    for(const ticket of tickets) {
        let ticketResult: GetTicket = {
            id: "",
            type: "",
            remainingEntries: 0,
            ownerName: "",
            ownerId: "",
            usedDate: "",
            entries: [],
            qrCode:"",
            price: 0,
        };

        const order = await Order.findByPk(ticket.orderId)
        if (order.state === ORDER_STATE.PAID){
            ticketResult.id = ticket.id;
            ticketResult.price = ticket.price;
            
            const ticketType = await TicketType.findByPk(ticket.ticketTypeId)
            ticketResult.type = ticketType.name;
            const qrCode = await generateQrCode(ticket.id, 'buffer', ticketType.getExpiresIn());
            ticketResult.qrCode = Buffer.from(qrCode).toString('base64');

            if (ticket.associatedSwimmerId) {
                const associatedSwimmer = await AssociatedSwimmer.findByPk(ticket.associatedSwimmerId)
                ticketResult.ownerName = associatedSwimmer.firstname + ' ' + associatedSwimmer.lastname;
                ticketResult.ownerId = ticket.associatedSwimmerId;
            } else {
                ticketResult.ownerName = loggedUser.given_name + ' ' + loggedUser.family_name
                ticketResult.ownerId = ticket.loggedUserId;
            }

            ticketResult.entries = await getEntries(ticket.id);
            
            result.push(ticketResult)
        }
    }
    
    return res.json(result);
} catch (err) {
    return next(err);
}
}


const getEntries = async (
	ticketId: string
) => {
    const entries = await Entry.findAll({where: {ticketId: ticketId}, order: [['timestamp', 'ASC'],],})
    let result: GetEntry[] = [];
    let entryResult: GetEntry | null  = null;
    for(const entry of entries) {
        if (entry.type === ENTRY_TYPE.CHECKIN ) {
            if (entryResult) {
                result.push(entryResult);
                entryResult = null;
            }
            const pool = await SwimmingPool.findByPk(entry.swimmingPoolId)
            entryResult = {
                id: entry.id,
                from: entry.timestamp.getTime(),
                to: null,
                poolName: pool.name,
            }
        } else if (entryResult && entry.type === ENTRY_TYPE.CHECKOUT ) {
            entryResult.to = entry.timestamp.getTime();
            result.push(entryResult);
            entryResult = null;
        } 
    }
    return result.reverse()
}