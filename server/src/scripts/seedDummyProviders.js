import "dotenv/config";
import bcrypt from "bcryptjs";
import { connectDb } from "../db.js";
import { Service } from "../models/Service.js";
import { User } from "../models/User.js";

const password = String(process.env.SEED_DUMMY_PASSWORD ?? "Password@123");

const providers = [
  {
    name: "Raju Plumber",
    email: "plumber@demo.gramseva.local",
    services: [
      {
        title: "Pipe Leakage Fix",
        category: "Plumbing",
        description: "Leak repair, tap replacement, basic fitting work",
        location: "Patna",
        price: 199
      },
      {
        title: "Bathroom Fitting",
        category: "Plumbing",
        description: "Installation of washbasin, shower, and fittings",
        location: "Patna",
        price: 499
      }
    ]
  },
  {
    name: "Aman Electrician",
    email: "electrician@demo.gramseva.local",
    services: [
      {
        title: "Home Wiring Check",
        category: "Electrical",
        description: "Short-circuit check, MCB/fuse inspection, wiring safety",
        location: "Gaya",
        price: 249
      },
      {
        title: "Appliance Repair Visit",
        category: "Electrical",
        description: "Fan, switchboard, light fitting troubleshooting",
        location: "Gaya",
        price: 199
      }
    ]
  },
  {
    name: "Neha Tutor",
    email: "teacher@demo.gramseva.local",
    services: [
      {
        title: "Maths Tuition (Class 6-10)",
        category: "Education",
        description: "Weekly classes with doubt sessions and homework support",
        location: "Patna",
        price: 299
      },
      {
        title: "English Speaking Practice",
        category: "Education",
        description: "Conversation practice, grammar basics, interview prep",
        location: "Muzaffarpur",
        price: 249
      }
    ]
  },
  {
    name: "Dr. Suman",
    email: "doctor@demo.gramseva.local",
    services: [
      {
        title: "General Physician Consultation",
        category: "Healthcare",
        description: "Fever, cold, BP/diabetes follow-up, basic prescription",
        location: "Patna",
        price: 399
      },
      {
        title: "Health Checkup (Basic)",
        category: "Healthcare",
        description: "Vitals check + guidance; lab tests not included",
        location: "Muzaffarpur",
        price: 299
      }
    ]
  },
  {
    name: "Irfan Carpenter",
    email: "carpenter@demo.gramseva.local",
    services: [
      {
        title: "Door/Window Repair",
        category: "Carpentry",
        description: "Hinges, lock alignment, minor wood repairs",
        location: "Gaya",
        price: 299
      }
    ]
  },
  {
    name: "Pooja Cleaner",
    email: "cleaning@demo.gramseva.local",
    services: [
      {
        title: "Home Deep Cleaning",
        category: "Cleaning",
        description: "Kitchen + bathroom deep clean, dusting and mopping",
        location: "Patna",
        price: 599
      }
    ]
  }
];

await connectDb();

const passwordHash = await bcrypt.hash(password, 10);

let createdProviders = 0;
let updatedProviders = 0;
let createdServices = 0;
let updatedServices = 0;

for (const p of providers) {
  const email = String(p.email).toLowerCase().trim();
  let provider = await User.findOne({ email });
  if (!provider) {
    provider = await User.create({
      name: p.name,
      email,
      passwordHash,
      role: "provider",
      isActive: true
    });
    createdProviders += 1;
  } else {
    provider.name = p.name;
    provider.passwordHash = passwordHash;
    provider.role = "provider";
    provider.isActive = true;
    await provider.save();
    updatedProviders += 1;
  }

  for (const s of p.services) {
    const title = String(s.title).trim();
    const existingService = await Service.findOne({ provider: provider._id, title });
    if (!existingService) {
      await Service.create({
        provider: provider._id,
        title,
        category: String(s.category).trim(),
        description: String(s.description ?? "").trim(),
        location: String(s.location ?? "").trim(),
        price: Number.isFinite(Number(s.price)) ? Number(s.price) : 0,
        isActive: true
      });
      createdServices += 1;
    } else {
      existingService.category = String(s.category).trim();
      existingService.description = String(s.description ?? "").trim();
      existingService.location = String(s.location ?? "").trim();
      existingService.price = Number.isFinite(Number(s.price)) ? Number(s.price) : 0;
      existingService.isActive = true;
      await existingService.save();
      updatedServices += 1;
    }
  }
}

process.stdout.write(
  `Dummy seed done\nProviders: +${createdProviders} / ~${updatedProviders}\nServices: +${createdServices} / ~${updatedServices}\n`
);
process.exit(0);

