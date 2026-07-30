import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import path from 'path';
import dns from 'dns';

// Fix for Node.js SRV lookup issues on Windows
dns.setDefaultResultOrder('ipv4first');

import { 
  CustomRole, 
  User, 
  ParentProfile, 
  StudentProfile, 
  Classroom, 
  Role, 
  UserStatus, 
  Gender 
} from '../src/models';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env') });

const MONGODB_URI = process.env.DATABASE_URL || "";

const nurseryClassData = [
  {
    parentFirstName: "VishnuVardhan",
    parentLastName: "Reddy",
    parentPhone: "9553571357",
    parentEmail: "admin1@sreevismayeeschool.com",
    parentPassword: "9553571357",
    childName: "Sriniti Pishati",
    admissionNo: "SV26035",
    childPhone: "9553571357",
    dob: "12-07-2023",
    gender: "F",
    studentEmail: "Sriniti@gmail.com"
  },
  {
    parentFirstName: "Hemanth",
    parentLastName: "Yarlagadda",
    parentPhone: "8861008644",
    parentEmail: "admin2@sreevismayeeschool.com",
    parentPassword: "8861008644",
    childName: "Jahnavi Yarlagadda",
    admissionNo: "SV26026",
    childPhone: "8861008644",
    dob: "01-11-2022",
    gender: "F",
    studentEmail: "Jahnavi@gmail.com"
  },
  {
    parentFirstName: "Praveen",
    parentLastName: "Kumar",
    parentPhone: "8985855062",
    parentEmail: "Keerthivarudu07@gmail.com",
    parentPassword: "8985855062",
    childName: "Saanvika U",
    admissionNo: "SV26027",
    childPhone: "8985855062",
    dob: "06-10-2022",
    gender: "F",
    studentEmail: "Saanvika@gmail.com"
  },
  {
    parentFirstName: "Mahesh Reddy",
    parentLastName: "K",
    parentPhone: "9390020582",
    parentEmail: "kitt46440@gmail.com",
    parentPassword: "9390020582",
    childName: "Mahannya Reddy K",
    admissionNo: "SV26033",
    childPhone: "9390020582",
    dob: "17-11-2023",
    gender: "F",
    studentEmail: "Mahannya@gmail.com"
  },
  {
    parentFirstName: "Suresh Babu",
    parentLastName: "B",
    parentPhone: "9000569827",
    parentEmail: "admin3@sreevismayeeschool.com",
    parentPassword: "9000569827",
    childName: "DharmaTej Bellary",
    admissionNo: "SV26032",
    childPhone: "9000569827",
    dob: "14-06-2023",
    gender: "M",
    studentEmail: "DharmaTej@gmail.com"
  },
  {
    parentFirstName: "Ashish",
    parentLastName: "A.V",
    parentPhone: "9502365367",
    parentEmail: "Venkata606@gmail.com",
    parentPassword: "9502365367",
    childName: "Vagdevi Aadimoolam",
    admissionNo: "SV26031",
    childPhone: "9502365367",
    dob: "27-02-2023",
    gender: "F",
    studentEmail: "Vagdevi@gmail.com"
  },
  {
    parentFirstName: "Nanda kishore",
    parentLastName: "M",
    parentPhone: "9742361622",
    parentEmail: "mnkr447@gmail.com",
    parentPassword: "9742361622",
    childName: "Sharnika Reddy M",
    admissionNo: "SV26024",
    childPhone: "9742361622",
    dob: "22-02-2023",
    gender: "F",
    studentEmail: "Sharnika@gmail.com"
  },
  {
    parentFirstName: "Vamsi Krishna",
    parentLastName: "V.",
    parentPhone: "9705808089",
    parentEmail: "vamshikrishnamails@gmail.com",
    parentPassword: "9705808089",
    childName: "Hanvitha Shree Vallala",
    admissionNo: "SV26028",
    childPhone: "9705808089",
    dob: "12-12-2022",
    gender: "F",
    studentEmail: "Hanvitha@gmail.com"
  },
  {
    parentFirstName: "Asif",
    parentLastName: "Mohd",
    parentPhone: "9553003065",
    parentEmail: "admin4@sreevismayeeschool.com",
    parentPassword: "9553003065",
    childName: "Azlan Mohd",
    admissionNo: "SV26029",
    childPhone: "9553003065",
    dob: "13-03-2023",
    gender: "M",
    studentEmail: "Azlan@gmail.com"
  },
  {
    parentFirstName: "Srinivas",
    parentLastName: "Ch.",
    parentPhone: "8374575983",
    parentEmail: "srinivashpt983@gmail.com",
    parentPassword: "8374575983",
    childName: "Hruthvika Ch",
    admissionNo: "SV26030",
    childPhone: "8374575983",
    dob: "11-05-2023",
    gender: "F",
    studentEmail: "Hruthvika@gmail.com"
  },
  {
    parentFirstName: "Ajay Kumar",
    parentLastName: "Jakku",
    parentPhone: "9346848467",
    parentEmail: "ajaykumarjakku@gmail.com",
    parentPassword: "9346848467",
    childName: "Aryansh Jakku",
    admissionNo: "SV26034",
    childPhone: "9346848467",
    dob: "04-02-2023",
    gender: "M",
    studentEmail: "Aryansh@gmail.com"
  },
  {
    parentFirstName: "Prasad",
    parentLastName: "T",
    parentPhone: "8977992741",
    parentEmail: "admin5@sreevismayeeschool.com",
    parentPassword: "8977992741",
    childName: "Paavanika",
    admissionNo: "SV26025",
    childPhone: "8977992741",
    dob: "19-11-2022",
    gender: "F",
    studentEmail: "Paavanika@gmail.com"
  },
  {
    parentFirstName: "Narpatsingh",
    parentLastName: "singh",
    parentPhone: "9381378072",
    parentEmail: "admin6@sreevismayeeschool.com",
    parentPassword: "9381378072",
    childName: "Ravinder singh",
    admissionNo: "SV26037",
    childPhone: "9381378072",
    dob: "27/4/2022",
    gender: "M",
    studentEmail: "Ravinder@gmail.com"
  },
  {
    parentFirstName: "Prasad",
    parentLastName: "T",
    parentPhone: "9912837156",
    parentEmail: "admin7@sreevismayeeschool.com",
    parentPassword: "9912837156",
    childName: "Sankeerthana",
    admissionNo: "SV26036",
    childPhone: "9912837156",
    dob: "25/6/2020",
    gender: "F",
    studentEmail: "Sankeerthana@gmail.com"
  },
  {
    parentFirstName: "Sandeep",
    parentLastName: "Kumar",
    parentPhone: "9642934413",
    parentEmail: "admin8@sreevismayeeschool.com",
    parentPassword: "9642934413",
    childName: "Thanvidhara",
    admissionNo: "SV26043",
    childPhone: "9441181581",
    dob: "7/4/2023",
    gender: "F",
    studentEmail: "Thanvidhara@gmail.com"
  },
  {
    parentFirstName: "Karthik",
    parentLastName: "Kumar",
    parentPhone: "9177513808",
    parentEmail: "karthikkumar33@gmail.com",
    parentPassword: "9177513808",
    childName: "Airav",
    admissionNo: "SV26044",
    childPhone: "9177513808",
    dob: "10/5/2022",
    gender: "M",
    studentEmail: "Airav@gmail.com"
  },
  {
    parentFirstName: "Hanmandlu",
    parentLastName: "Navya",
    parentPhone: "8179328346",
    parentEmail: "kruthiksai06@gmail.com",
    parentPassword: "8179328346",
    childName: "KruthikSai",
    admissionNo: "SV26045",
    childPhone: "8179328346",
    dob: "6/1/2023",
    gender: "M",
    studentEmail: "KruthikSai@gmail.com"
  }
];

const ppiClassData = [
  {
    parentFirstName: "PRADEEP",
    parentLastName: "SHIRUDE",
    parentPhone: "9703672020",
    parentEmail: "admin9@sreevismayeeschool.com",
    parentPassword: "9703672020",
    childName: "Sidhyansh Shirude",
    admissionNo: "SV26018",
    childPhone: "9703672020",
    dob: "15-05-2022",
    gender: "M",
    studentEmail: "Sidhyansh@gmail.com"
  },
  {
    parentFirstName: "SRIKANTH",
    parentLastName: "AKKINENI",
    parentPhone: "8977316801",
    parentEmail: "admin10@sreevismayeeschool.com",
    parentPassword: "8977316801",
    childName: "Adarsh Akkineni",
    admissionNo: "SV26016",
    childPhone: "8977316801",
    dob: "07-01-2021",
    gender: "M",
    studentEmail: "Adarsh@gmail.com"
  },
  {
    parentFirstName: "Mylsamy",
    parentLastName: "M",
    parentPhone: "9842959422",
    parentEmail: "mylsamyveet@gmail.com",
    parentPassword: "9842959422",
    childName: "Mouna Darshana M",
    admissionNo: "SV26017",
    childPhone: "9842959422",
    dob: "04-10-2021",
    gender: "F",
    studentEmail: "Mouna@gmail.com"
  },
  {
    parentFirstName: "Teja",
    parentLastName: "K.R.K",
    parentPhone: "9010385385",
    parentEmail: "KRKTEJA@gmail.com",
    parentPassword: "9010385385",
    childName: "Sri Datta Kruthik K",
    admissionNo: "SV26021",
    childPhone: "9010385385",
    dob: "20-12-2021",
    gender: "M",
    studentEmail: "Datta@gmail.com"
  },
  {
    parentFirstName: "Srinivas",
    parentLastName: "Kasireddy",
    parentPhone: "9700586258",
    parentEmail: "KSR424@gmail.com",
    parentPassword: "9700586258",
    childName: "Advik kasireddy",
    admissionNo: "SV26015",
    childPhone: "9700586258",
    dob: "30-03-2022",
    gender: "M",
    studentEmail: "Advik@gmail.com"
  },
  {
    parentFirstName: "Venkata Narayana",
    parentLastName: "Epperla",
    parentPhone: "8977038700",
    parentEmail: "epperlavenkata999@gmail.com",
    parentPassword: "8977038700",
    childName: "Harshitha Epperla",
    admissionNo: "SV26014",
    childPhone: "8977038700",
    dob: "28-10-2021",
    gender: "F",
    studentEmail: "Harshitha@gmail.com"
  },
  {
    parentFirstName: "Suman",
    parentLastName: "B",
    parentPhone: "888618860",
    parentEmail: "admin11@sreevismayeeschool.com",
    parentPassword: "888618860",
    childName: "Rithanya Banda",
    admissionNo: "SV26020",
    childPhone: "888618860",
    dob: "04-05-2022",
    gender: "F",
    studentEmail: "Rithanya@gmail.com"
  },
  {
    parentFirstName: "Sarat Chandra",
    parentLastName: "A",
    parentPhone: "9500004241",
    parentEmail: "admin12@sreevismayeeschool.com",
    parentPassword: "9500004241",
    childName: "Srivedavani A",
    admissionNo: "SV26022",
    childPhone: "9500004241",
    dob: "23-10-2021",
    gender: "F",
    studentEmail: "Srivedavani@gmail.com"
  },
  {
    parentFirstName: "Pramod",
    parentLastName: "Rachchawar",
    parentPhone: "9160910302",
    parentEmail: "rachawar.pramod@gmail.com",
    parentPassword: "9160910302",
    childName: "Manan Rachchawar",
    admissionNo: "SV26019",
    childPhone: "9160910302",
    dob: "14-01-2021",
    gender: "M",
    studentEmail: "Manan@gmail.com"
  },
  {
    parentFirstName: "Srikanth",
    parentLastName: "s",
    parentPhone: "9676115342",
    parentEmail: "rachanasunkari0912@gmail.com",
    parentPassword: "9676115342",
    childName: "Vedhansh",
    admissionNo: "SV26038",
    childPhone: "9676115342",
    dob: "14/9/2022",
    gender: "M",
    studentEmail: "Vedhansh@gmail.com"
  },
  {
    parentFirstName: "Balraj",
    parentLastName: "K",
    parentPhone: "9948043385",
    parentEmail: "sangeethayadav1998@gmail.com",
    parentPassword: "9948043385",
    childName: "Advitha",
    admissionNo: "SV26023",
    childPhone: "9948043385",
    dob: "", // DOB is missing in source document
    gender: "F",
    studentEmail: "Advitha@gmail.com"
  }
];

const ppiiClassData = [
  {
    parentFirstName: "Dinesh",
    parentLastName: "Saluja",
    parentPhone: "9266456168",
    parentEmail: "admin13@sreevismayeeschool.com",
    parentPassword: "9266456168",
    childName: "Adira Saluja",
    admissionNo: "SV26001",
    childPhone: "9266456168",
    dob: "03-05-2021",
    gender: "F",
    studentEmail: "Adira@gmail.com"
  },
  {
    parentFirstName: "Chandrahass",
    parentLastName: "Thirumalasetty",
    parentPhone: "8886903799",
    parentEmail: "TCHNADRAHASS@gmail.com",
    parentPassword: "8886903799",
    childName: "Shanmukha Sriyanshi Thirumalasetty",
    admissionNo: "SV26012",
    childPhone: "8886903799",
    dob: "19-11-2020",
    gender: "F",
    studentEmail: "Shanmukha@gmail.com"
  },
  {
    parentFirstName: "Appa Saheb",
    parentLastName: "Bhadargade",
    parentPhone: "9970802814",
    parentEmail: "admin14@sreevismayeeschool.com",
    parentPassword: "9970802814",
    childName: "Shreeniketh Bhadargade",
    admissionNo: "SV26010",
    childPhone: "9970802814",
    dob: "21-01-2021",
    gender: "M",
    studentEmail: "Shreeniketh@gmail.com"
  },
  {
    parentFirstName: "Rajendar Reddy",
    parentLastName: "Puram",
    parentPhone: "9912042037",
    parentEmail: "rajreddy.purom85@gmail.com",
    parentPassword: "9912042037",
    childName: "Shivansh Reddy Puram",
    admissionNo: "SV26009",
    childPhone: "9912042037",
    dob: "12-11-2020",
    gender: "M",
    studentEmail: "Shivansh@gmail.com"
  },
  {
    parentFirstName: "Premnath",
    parentLastName: "P.S",
    parentPhone: "9620822077",
    parentEmail: "Premnathvm3@gmail.com",
    parentPassword: "9620822077",
    childName: "Sharvin .P.S",
    admissionNo: "SV26013",
    childPhone: "9620822077",
    dob: "06-01-2021",
    gender: "M",
    studentEmail: "Sharvin@gmail.com"
  },
  {
    parentFirstName: "Premdoss",
    parentLastName: "Raj",
    parentPhone: "7799967004",
    parentEmail: "premdoss1989@gmail.com",
    parentPassword: "7799967004",
    childName: "Pruthvi Raj",
    admissionNo: "SV26011",
    childPhone: "7799967004",
    dob: "24-07-2021",
    gender: "M",
    studentEmail: "Pruthvi@gmail.com"
  },
  {
    parentFirstName: "Venkata",
    parentLastName: "Bavirisetty",
    parentPhone: "7675991870",
    parentEmail: "VENKATA.BAVIRISETTY@YAHOO.COM",
    parentPassword: "7675991870",
    childName: "Hetvik Bavirisetty",
    admissionNo: "SV26008",
    childPhone: "7675991870",
    dob: "23-03-2021",
    gender: "M",
    studentEmail: "Hetvik@gmail.com"
  },
  {
    parentFirstName: "Abdul Mojahid Tabrez",
    parentLastName: "Abdul",
    parentPhone: "8801439975",
    parentEmail: "MOJAHIDASIF@gmail.com",
    parentPassword: "8801439975",
    childName: "Abdul Zeesha Tabrez",
    admissionNo: "SV26002",
    childPhone: "8801439975",
    dob: "25-09-2021",
    gender: "F",
    studentEmail: "Abdul@gmail.com"
  },
  {
    parentFirstName: "Avinash",
    parentLastName: "Ranjan",
    parentPhone: "7680957495",
    parentEmail: "tanwishyma08@gmail.com",
    parentPassword: "7680957495",
    childName: "Ayaan Ranjan",
    admissionNo: "SV26004",
    childPhone: "7680957495",
    dob: "10-11-2020",
    gender: "M",
    studentEmail: "Ayaan@gmail.com"
  },
  {
    parentFirstName: "Raju",
    parentLastName: "Putchala",
    parentPhone: "8099884349",
    parentEmail: "RajP1513@gmail.com",
    parentPassword: "8099884349",
    childName: "Gagana Sri",
    admissionNo: "SV26003",
    childPhone: "8099884349",
    dob: "12-02-2021",
    gender: "F",
    studentEmail: "Gagana@gmail.com"
  },
  {
    parentFirstName: "TolichaNaik",
    parentLastName: "Naik",
    parentPhone: "8977674323",
    parentEmail: "admin15@sreevismayeeschool.com",
    parentPassword: "8977674323",
    childName: "Kriti",
    admissionNo: "SV26042",
    childPhone: "8977674323",
    dob: "7/3/2021",
    gender: "F",
    studentEmail: "Kriti@gmail.com"
  }
];

const grade1ClassData = [
  {
    parentFirstName: "Srinivas",
    parentLastName: "kasireddy",
    parentPhone: "9700586258",
    parentEmail: "KSR424@gmail.com",
    parentPassword: "9700586258",
    childName: "Harshad kasireddy",
    admissionNo: "SV26007",
    childPhone: "9700586258",
    dob: "29-09-2020",
    gender: "M",
    studentEmail: "Harshad@gmail.com"
  },
  {
    parentFirstName: "BalRaju",
    parentLastName: "K",
    parentPhone: "9948043385",
    parentEmail: "sangeethayadav1998@gmail.com",
    parentPassword: "9948043385",
    childName: "Advika K",
    admissionNo: "SV26005",
    childPhone: "9948043385",
    dob: "26-04-2020",
    gender: "F",
    studentEmail: "Advika@gmail.com"
  },
  {
    parentFirstName: "AnilKumar",
    parentLastName: "Ragam",
    parentPhone: "9000099444",
    parentEmail: "anilkumaryadav245@gmail.com",
    parentPassword: "9000099444",
    childName: "Veksha Yadav Ragam",
    admissionNo: "SV26006",
    childPhone: "9000099444",
    dob: "15-10-2020",
    gender: "F",
    studentEmail: "Veksha@gmail.com"
  },
  {
    parentFirstName: "Samuel sudhakar",
    parentLastName: "Pashala",
    parentPhone: "7893236626",
    parentEmail: "sam.samuel432@gmail.com",
    parentPassword: "7893236626",
    childName: "Asher Deven pasala",
    admissionNo: "SV26039",
    childPhone: "7893236626",
    dob: "7/8/2019",
    gender: "M",
    studentEmail: "Asher@gmail.com"
  }
];

function parseDate(dateStr: string): Date {
  if (!dateStr || dateStr.trim() === "") {
    // Return approximate DOB (e.g., 4 years old in 2026 -> 2022)
    return new Date(2022, 0, 1);
  }
  const parts = dateStr.split(/[-/]/);
  if (parts.length === 3) {
    const day = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1; // 0-indexed month
    const year = parseInt(parts[2], 10);
    return new Date(year, month, day);
  }
  return new Date(dateStr);
}

async function seedClassroomData(
  classData: any[],
  classroom: any,
  parentRole: any,
  studentRole: any,
  UserModel: any,
  ParentProfileModel: any,
  StudentProfileModel: any
) {
  for (const entry of classData) {
    console.log(`Processing Parent: ${entry.parentEmail}, Student: ${entry.studentEmail}`);

    // 1. Process Parent User
    let parentUser = await UserModel.findOne({ email: entry.parentEmail });
    const parentHashedPassword = await bcrypt.hash(entry.parentPassword, 10);

    if (!parentUser) {
      parentUser = await UserModel.create({
        email: entry.parentEmail,
        password: parentHashedPassword,
        role: Role.PARENT,
        status: UserStatus.ACTIVE,
        firstName: entry.parentFirstName,
        lastName: entry.parentLastName,
        phone: entry.parentPhone,
        customRoleId: parentRole.id
      });
      console.log(`  -> Created Parent User: ${entry.parentEmail}`);
    } else {
      parentUser.password = parentHashedPassword;
      parentUser.firstName = entry.parentFirstName;
      parentUser.lastName = entry.parentLastName;
      parentUser.phone = entry.parentPhone;
      parentUser.status = UserStatus.ACTIVE;
      await parentUser.save();
      console.log(`  -> Updated existing Parent User: ${entry.parentEmail}`);
    }

    // Process Parent Profile
    let parentProfile = await ParentProfileModel.findOne({ userId: parentUser.id });
    if (!parentProfile) {
      parentProfile = await ParentProfileModel.create({
        userId: parentUser.id,
        profession: 'Parent',
        address: 'Not Specified'
      });
      console.log(`  -> Created Parent Profile for ${entry.parentEmail}`);
    }

    // 2. Process Student User & Profile
    const studentHashedPassword = parentHashedPassword; 
    const parts = entry.childName.trim().split(/\s+/);
    const childFirstName = parts[0];
    const childLastName = parts.slice(1).join(' ') || entry.parentLastName || '';

    // Find student user by email first
    let studentUser = await UserModel.findOne({ email: entry.studentEmail });

    if (!studentUser) {
      studentUser = await UserModel.create({
        email: entry.studentEmail,
        password: studentHashedPassword,
        role: Role.STUDENT,
        status: UserStatus.ACTIVE,
        firstName: childFirstName,
        lastName: childLastName,
        phone: entry.childPhone,
        customRoleId: studentRole.id
      });
      console.log(`  -> Created Student User: ${entry.studentEmail}`);
    } else {
      studentUser.password = studentHashedPassword;
      studentUser.firstName = childFirstName;
      studentUser.lastName = childLastName;
      studentUser.phone = entry.childPhone;
      studentUser.status = UserStatus.ACTIVE;
      await studentUser.save();
      console.log(`  -> Updated existing Student User: ${entry.studentEmail}`);
    }

    // Now look up profile by admission number
    let studentProfile = await StudentProfileModel.findOne({ admissionNo: entry.admissionNo });

    const parsedDob = parseDate(entry.dob);
    const genderMapped = entry.gender.toUpperCase() === 'M' ? Gender.MALE : Gender.FEMALE;

    if (!studentProfile) {
      // Double check if profile exists by userId to prevent 1-to-1 violation
      studentProfile = await StudentProfileModel.findOne({ userId: studentUser.id });
    }

    if (!studentProfile) {
      studentProfile = await StudentProfileModel.create({
        userId: studentUser.id,
        admissionNo: entry.admissionNo,
        dob: parsedDob,
        gender: genderMapped,
        classroomId: classroom.id,
        parentId: parentProfile.id
      });
      console.log(`  -> Created Student Profile for ${entry.childName} (Admission: ${entry.admissionNo})`);
    } else {
      studentProfile.userId = studentUser.id;
      studentProfile.admissionNo = entry.admissionNo;
      studentProfile.dob = parsedDob;
      studentProfile.gender = genderMapped;
      studentProfile.classroomId = classroom.id;
      studentProfile.parentId = parentProfile.id;
      await studentProfile.save();
      console.log(`  -> Updated existing Student Profile for ${entry.childName} (Admission: ${entry.admissionNo})`);
    }
  }
}

async function main() {
  if (!MONGODB_URI) {
    throw new Error("DATABASE_URL env variable is not set!");
  }

  console.log('Connecting to database...');
  await mongoose.connect(MONGODB_URI);
  console.log('Connected to database successfully!');

  const CustomRoleModel = CustomRole as any;
  const UserModel = User as any;
  const ParentProfileModel = ParentProfile as any;
  const StudentProfileModel = StudentProfile as any;
  const ClassroomModel = Classroom as any;

  // Find custom roles for Parent and Student
  let parentRole = await CustomRoleModel.findOne({ name: 'Parent' });
  if (!parentRole) {
    parentRole = await CustomRoleModel.create({
      name: 'Parent',
      description: 'Parent System Role'
    });
    console.log('Created missing custom role: Parent');
  }

  let studentRole = await CustomRoleModel.findOne({ name: 'Student' });
  if (!studentRole) {
    studentRole = await CustomRoleModel.create({
      name: 'Student',
      description: 'Student System Role'
    });
    console.log('Created missing custom role: Student');
  }

  // Find or create Nursery classroom
  let nurseryClassroom = await ClassroomModel.findOne({ name: { $regex: /^nursery/i } });
  if (!nurseryClassroom) {
    nurseryClassroom = await ClassroomModel.create({
      name: 'Nursery A',
      gradeLevel: 0,
      division: 'PRE_PRIMARY'
    });
    console.log('Created Classroom: Nursery A');
  } else {
    console.log(`Using existing Classroom: ${nurseryClassroom.name}`);
  }

  // Find or create PP-I classroom
  let ppiClassroom = await ClassroomModel.findOne({ name: { $regex: /^pp-i/i } });
  if (!ppiClassroom) {
    ppiClassroom = await ClassroomModel.create({
      name: 'PP-I',
      gradeLevel: 0,
      division: 'PRE_PRIMARY'
    });
    console.log('Created Classroom: PP-I');
  } else {
    console.log(`Using existing Classroom: ${ppiClassroom.name}`);
  }

  // Find or create PP-II classroom
  let ppiiClassroom = await ClassroomModel.findOne({ name: { $regex: /^pp-ii/i } });
  if (!ppiiClassroom) {
    ppiiClassroom = await ClassroomModel.create({
      name: 'PP-II',
      gradeLevel: 0,
      division: 'PRE_PRIMARY'
    });
    console.log('Created Classroom: PP-II');
  } else {
    console.log(`Using existing Classroom: ${ppiiClassroom.name}`);
  }

  // Find or create Grade-1 classroom
  let grade1Classroom = await ClassroomModel.findOne({ name: { $regex: /^(grade[- ]?1|grade-1)$/i } });
  if (!grade1Classroom) {
    grade1Classroom = await ClassroomModel.create({
      name: 'Grade-1',
      gradeLevel: 1,
      division: 'PRIMARY'
    });
    console.log('Created Classroom: Grade-1');
  } else {
    console.log(`Using existing Classroom: ${grade1Classroom.name}`);
  }

  // Seed Nursery class data
  console.log(`--- Seeding ${nurseryClassData.length} Nursery class parent-student records ---`);
  await seedClassroomData(
    nurseryClassData,
    nurseryClassroom,
    parentRole,
    studentRole,
    UserModel,
    ParentProfileModel,
    StudentProfileModel
  );

  // Seed PP-I class data
  console.log(`--- Seeding ${ppiClassData.length} PP-I class parent-student records ---`);
  await seedClassroomData(
    ppiClassData,
    ppiClassroom,
    parentRole,
    studentRole,
    UserModel,
    ParentProfileModel,
    StudentProfileModel
  );

  // Seed PP-II class data
  console.log(`--- Seeding ${ppiiClassData.length} PP-II class parent-student records ---`);
  await seedClassroomData(
    ppiiClassData,
    ppiiClassroom,
    parentRole,
    studentRole,
    UserModel,
    ParentProfileModel,
    StudentProfileModel
  );

  // Seed Grade-1 class data
  console.log(`--- Seeding ${grade1ClassData.length} Grade-1 class parent-student records ---`);
  await seedClassroomData(
    grade1ClassData,
    grade1Classroom,
    parentRole,
    studentRole,
    UserModel,
    ParentProfileModel,
    StudentProfileModel
  );

  console.log('Database seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error('Error seeding data:', e);
    process.exit(1);
  })
  .finally(async () => {
    await mongoose.disconnect();
    console.log('Disconnected from database.');
  });
