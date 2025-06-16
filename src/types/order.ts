type Prescription = {
  RFID: string
  PrescriptionNo: string
  HN: string
  PatientName: string
  Prescription: PrescriptionList[]
}

type PrescriptionList = {
  f_prescriptionno: string
  f_prescriptiondate: string
  f_hn: string
  f_an: string
  f_patientname: string
  f_wardcode: string
  f_warddesc: string
  f_prioritycode: string
  f_prioritydesc: string
  f_orderitemcode: string
  f_orderitemname: string
  f_orderqty: number
  f_orderunitcode: string
  Machine: string
  command: string
  f_binlocation: string
  RowID: string
}

type ResponsePres = {
  status: string,
  data: Prescription
}

export type { Prescription, PrescriptionList, ResponsePres }
