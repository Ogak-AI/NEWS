import datetime
from database import engine, SessionLocal, Base
from models import Source

def load_mock_data():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    
    # Check if data exists
    if db.query(Source).first():
        print("Mock data already loaded.")
        db.close()
        return

    sources = [
        Source(
            title="UN Global Ice Assessment 2026",
            url="https://un-climate-reports.mock/gia-2026",
            publisher="United Nations Climate Panel",
            published_date=datetime.datetime.now().isoformat(),
            content="""
            The UN Climate Panel today released the 2026 Global Ice Assessment. 
            The report concludes that Greenland's ice sheet melt has accelerated by 18% compared to the 2020-2025 average.
            The primary driver identified is the anomalous warming of the North Atlantic currents. 
            Consequently, global sea-level rise projections for 2050 have been revised upwards by 4 centimeters.
            The panel urges immediate carbon sequestration efforts to mitigate further acceleration.
            """
        ),
        Source(
            title="Economic Impact of Revised Sea Level Models",
            url="https://aegis-financial.mock/reports/ice-melt-risk",
            publisher="Aegis Financial Risk Analytics",
            published_date=datetime.datetime.now().isoformat(),
            content="""
            In light of the newly published UN Global Ice Assessment indicating an 18% acceleration in Greenland ice melt,
            we are revising our coastal real estate risk index. The projected 4cm increase in sea-level rise by 2050 
            will likely introduce an estimated $450 billion in uninsurable liabilities across the US Eastern Seaboard.
            Municipal bond ratings for Miami and Norfolk are under negative review. 
            Markets should price in these structural risks immediately, particularly in the insurance sector.
            """
        ),
        Source(
            title="The UN Report is Too Little, Too Late",
            url="https://green-watch-ngo.mock/blog/un-report-2026",
            publisher="Earth Watchers NGO",
            published_date=datetime.datetime.now().isoformat(),
            content="""
            The UN's latest report on Greenland's melting ice is frankly too conservative. 
            While they cite an 18% acceleration, our independent field researchers recorded localized melt rates exceeding 25% in the Jakobshavn region.
            The UN's call for 'carbon sequestration' is a dangerous distraction favored by fossil fuel lobbyists, 
            rather than demanding an immediate halt to new drilling. The revised 4cm sea-level rise projection is a baseline, not a worst-case scenario.
            """
        )
    ]
    
    db.add_all(sources)
    db.commit()
    db.close()
    print("Successfully loaded 3 mock sources into the database.")

if __name__ == "__main__":
    load_mock_data()
