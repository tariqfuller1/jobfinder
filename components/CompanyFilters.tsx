"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

export function CompanyFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const updateParam = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value);
    else params.delete(key);
    params.delete("page");
    router.push(`${pathname}?${params.toString()}`);
  };

  return (
    <div className="filters">
      <label>
        Search companies
        <input
          defaultValue={searchParams.get("q") ?? ""}
          placeholder="Unity, gameplay, tools, remote..."
          onBlur={(event) => updateParam("q", event.target.value)}
        />
      </label>

      <label>
        Company type
        <select defaultValue={searchParams.get("category") ?? ""} onChange={(e) => updateParam("category", e.target.value)}>
          <option value="">All</option>
          <option value="SOFTWARE">Software</option>
          <option value="GAMING">Gaming</option>
          <option value="BOTH">Both</option>
        </select>
      </label>

      <label>
        Remote policy
        <select defaultValue={searchParams.get("remotePolicy") ?? ""} onChange={(e) => updateParam("remotePolicy", e.target.value)}>
          <option value="">All</option>
          <option value="REMOTE_FRIENDLY">Remote-friendly</option>
          <option value="FLEXIBLE">Flexible</option>
          <option value="HYBRID">Hybrid</option>
          <option value="ONSITE">On site</option>
        </select>
      </label>

      <label>
        Skill / engine / stack
        <input
          defaultValue={searchParams.get("skill") ?? ""}
          placeholder="Unity, React, C++, gameplay"
          onBlur={(event) => updateParam("skill", event.target.value)}
        />
      </label>

      <label>
        State / region
        <input
          defaultValue={searchParams.get("state") ?? ""}
          placeholder="NC, North Carolina, Remote US"
          onBlur={(event) => updateParam("state", event.target.value)}
        />
      </label>

      <label>
        Location
        <input
          defaultValue={searchParams.get("location") ?? ""}
          placeholder="Raleigh, Charlotte, Remote"
          onBlur={(event) => updateParam("location", event.target.value)}
        />
      </label>

      <label>
        ATS / source
        <input
          defaultValue={searchParams.get("ats") ?? ""}
          placeholder="Greenhouse, Lever, Ashby"
          onBlur={(event) => updateParam("ats", event.target.value)}
        />
      </label>

      <label>
        Company size
        <input
          defaultValue={searchParams.get("size") ?? ""}
          placeholder="1-50, 51-200, 1000+"
          onBlur={(event) => updateParam("size", event.target.value)}
        />
      </label>

      <label>
        Hiring now
        <select defaultValue={searchParams.get("activeHiring") ?? ""} onChange={(e) => updateParam("activeHiring", e.target.value)}>
          <option value="">All</option>
          <option value="true">Active hiring only</option>
        </select>
      </label>

      <label>
        Sort by
        <select defaultValue={searchParams.get("sort") ?? ""} onChange={(e) => updateParam("sort", e.target.value)}>
          <option value="">Hiring status</option>
          <option value="fit">Best fit score</option>
          <option value="jobs">Most open jobs</option>
          <option value="name">Company name (A–Z)</option>
        </select>
      </label>
    </div>
  );
}
